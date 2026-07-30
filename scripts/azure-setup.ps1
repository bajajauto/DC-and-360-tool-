<#
.SYNOPSIS
  One-time Azure configuration for the DC & 360 Tool (steps 2 and 3 of DEPLOYMENT.md).

.DESCRIPTION
  Configures the App Service (runtime, startup command, app settings) and the Postgres
  flexible server (creates the database, opens the firewall to the app's outbound IPs).

  Secrets are prompted for or generated locally and passed straight to Azure — nothing
  is written to disk or echoed to the console. Safe to re-run; every operation is
  idempotent.

.EXAMPLE
  az login
  ./scripts/azure-setup.ps1
#>
[CmdletBinding()]
param(
  [string]$WebAppName  = 'app-dc-and-360-tool-prod-ci-001',
  [string]$PgServerName = 'psql-dc-and-360-tool-prod-ci-001',
  [string]$DatabaseName = 'dc_tool',
  [string]$NodeVersion  = 'NODE|22-lts',
  [switch]$AllowAzureServicesInsteadOfIps
)

$ErrorActionPreference = 'Stop'

function Write-Step($message) { Write-Host "`n==> $message" -ForegroundColor Cyan }
function Write-Ok($message)   { Write-Host "    $message" -ForegroundColor Green }
function Write-Warn($message) { Write-Host "    $message" -ForegroundColor Yellow }

# ---------------------------------------------------------------- preflight ---

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
  throw "Azure CLI not found. Install it with:  winget install -e --id Microsoft.AzureCLI`nThen open a new shell and run 'az login'."
}

Write-Step 'Checking Azure login'
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) { throw "Not logged in. Run 'az login' first." }
Write-Ok "Subscription: $($account.name)"

Write-Step 'Locating resources'
$webAppRg = az webapp list --query "[?name=='$WebAppName'].resourceGroup | [0]" -o tsv
if ([string]::IsNullOrWhiteSpace($webAppRg)) { throw "Web app '$WebAppName' not found in subscription '$($account.name)'." }
Write-Ok "Web app '$WebAppName' in resource group '$webAppRg'"

$pgRg = az postgres flexible-server list --query "[?name=='$PgServerName'].resourceGroup | [0]" -o tsv
if ([string]::IsNullOrWhiteSpace($pgRg)) { throw "Postgres server '$PgServerName' not found." }
Write-Ok "Postgres '$PgServerName' in resource group '$pgRg'"

$defaultHostName = az webapp show -g $webAppRg -n $WebAppName --query defaultHostName -o tsv
$appUrl = "https://$defaultHostName"
Write-Ok "Public URL: $appUrl"

# ------------------------------------------------------------------ secrets ---

Write-Step 'Collecting secrets'

$pgAdminUser = az postgres flexible-server show -g $pgRg -n $PgServerName --query administratorLogin -o tsv
Write-Ok "Postgres admin user: $pgAdminUser"

$pgPasswordSecure = Read-Host "    Postgres password for '$pgAdminUser'" -AsSecureString
$pgPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPasswordSecure))
if ([string]::IsNullOrWhiteSpace($pgPasswordPlain)) { throw 'Password cannot be empty.' }

# Percent-encode: an unencoded '@' or '#' silently truncates the connection URL.
$pgPasswordEncoded = [uri]::EscapeDataString($pgPasswordPlain)
$pgHost = "$PgServerName.postgres.database.azure.com"
$databaseUrl = "postgresql://$pgAdminUser`:$pgPasswordEncoded@$pgHost`:5432/$DatabaseName`?sslmode=require"

# Reuse the existing JWT_SECRET if one is already set, so re-running this script
# does not invalidate every signed-in user's session.
$existingJwt = az webapp config appsettings list -g $webAppRg -n $WebAppName `
  --query "[?name=='JWT_SECRET'].value | [0]" -o tsv
if ([string]::IsNullOrWhiteSpace($existingJwt)) {
  $bytes = New-Object byte[] 48
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $jwtSecret = ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
  Write-Ok 'Generated a new JWT_SECRET'
} else {
  $jwtSecret = $existingJwt
  Write-Ok 'Reusing the JWT_SECRET already set on the app'
}

# SMTP config comes from the local .env so Brevo credentials are not retyped.
$envPath = Join-Path $PSScriptRoot '..\.env'
$envValues = @{}
if (Test-Path $envPath) {
  foreach ($line in Get-Content $envPath) {
    if ($line -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)$') {
      $envValues[$matches[1]] = $matches[2].Trim().Trim('"').Trim("'")
    }
  }
  Write-Ok "Read SMTP settings from $((Resolve-Path $envPath).Path)"
} else {
  Write-Warn '.env not found — SMTP settings will be skipped.'
}

# ------------------------------------------------------- app service config ---

Write-Step 'Configuring App Service runtime'
az webapp config set -g $webAppRg -n $WebAppName `
  --linux-fx-version $NodeVersion `
  --startup-file 'bash /home/site/wwwroot/startup.sh' `
  --always-on true `
  --output none
Write-Ok "Runtime $NodeVersion, startup.sh, Always On enabled"

az webapp update -g $webAppRg -n $WebAppName --https-only true --output none
Write-Ok 'HTTPS Only enabled'

Write-Step 'Applying application settings'
$settings = [ordered]@{
  DATABASE_URL                    = $databaseUrl
  JWT_SECRET                      = $jwtSecret
  APP_URL                         = $appUrl
  CLIENT_ORIGIN                   = $appUrl
  REPORTS_DIR                     = '/home/data/reports'
  SCM_DO_BUILD_DURING_DEPLOYMENT  = 'false'
  EMAIL_MODE                      = 'smtp'
}
foreach ($key in @('EMAIL_FROM', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS')) {
  if ($envValues.ContainsKey($key)) { $settings[$key] = $envValues[$key] }
}

$settingArgs = @()
foreach ($key in $settings.Keys) { $settingArgs += "$key=$($settings[$key])" }

az webapp config appsettings set -g $webAppRg -n $WebAppName --settings @settingArgs --output none
Write-Ok "Set $($settings.Count) settings: $($settings.Keys -join ', ')"
Write-Warn 'PORT is deliberately not set — App Service injects it.'

# ------------------------------------------------------------------ database ---

Write-Step "Creating database '$DatabaseName'"
$existingDb = az postgres flexible-server db list -g $pgRg -s $PgServerName --query "[?name=='$DatabaseName'].name | [0]" -o tsv
if ([string]::IsNullOrWhiteSpace($existingDb)) {
  az postgres flexible-server db create -g $pgRg -s $PgServerName -d $DatabaseName --output none
  Write-Ok "Created '$DatabaseName'"
} else {
  Write-Ok "'$DatabaseName' already exists"
}

# ------------------------------------------------------------------ firewall ---

Write-Step 'Opening the Postgres firewall to the app'
if ($AllowAzureServicesInsteadOfIps) {
  # 0.0.0.0/0 is Azure's magic value for "any Azure service", not the public internet.
  az postgres flexible-server firewall-rule create -g $pgRg -n $PgServerName `
    --rule-name 'AllowAllAzureServices' --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0 --output none
  Write-Ok 'Allowed all Azure services'
} else {
  # Use *possible* outbound IPs: the app breaks when App Service moves it otherwise.
  $possible = az webapp show -g $webAppRg -n $WebAppName --query possibleOutboundIpAddresses -o tsv
  $ips = $possible -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Sort-Object -Unique
  Write-Ok "$($ips.Count) possible outbound IPs to allow"
  $index = 0
  foreach ($ip in $ips) {
    $index++
    az postgres flexible-server firewall-rule create -g $pgRg -n $PgServerName `
      --rule-name ("appservice-{0:d2}" -f $index) --start-ip-address $ip --end-ip-address $ip --output none
  }
  Write-Ok "Added $index firewall rules"
}

Write-Step 'Done'
Write-Host @"
    App Service and Postgres are configured.

    Remaining manual step (a credential that must not pass through tooling):
      GitHub -> Settings -> Secrets and variables -> Actions -> New repository secret
        Name:  AZURE_WEBAPP_PUBLISH_PROFILE
        Value: full contents of $WebAppName.PublishSettings

    Then push to 'develop' to trigger the deploy.
    Migrations apply automatically on boot via startup.sh.
"@ -ForegroundColor Green
