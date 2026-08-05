# Discover the source IP that Azure actually sees for this machine, then pin it
# in the dc_tool Postgres firewall.
#
# Why this exists: no IP-echo service (whatsmyip, ipify, ifconfig.me, DNS TXT
# tricks) reports the address Azure observes from this network - we tried four
# and got four different wrong answers. The only reliable method is to connect
# and ask the server, via select inet_client_addr().
#
# Opens the firewall wide for ONE connection, reads the real source IP, then
# closes it again. The temp rule is removed in the finally block even if the
# connection fails or you Ctrl-C.
#
# Requires: az CLI (logged in, see -Tenant below), psql on PATH, and the
# Postgres password in $env:PGPASSWORD. Needs only these Azure permissions:
#   flexibleServers/read, flexibleServers/firewallRules/{read,write,delete}
#
# Usage:
#   $env:PGPASSWORD = '<ask the team for the dctooladmin password>'
#   .\scripts\dbdiag.ps1                      # just report the IP
#   .\scripts\dbdiag.ps1 -Pin -RuleName me    # report it and pin a rule

param(
    [switch]$Pin,
    [string]$RuleName = "Dev-access-$($env:USERNAME)-$(Get-Date -Format yyyyMMdd)"
)

$RG   = 'rg-hrtraining-ci-01'
$SRV  = 'psql-dc-and-360-tool-prod-ci-001'
$TEMP = "TEMP-diagnostic-$($env:USERNAME)-delete-me"

if (-not $env:PGPASSWORD) {
    Write-Error 'Set $env:PGPASSWORD first - the dctooladmin password is not stored in this repo.'
    exit 1
}
$env:PGCONNECT_TIMEOUT = '25'

$realIp = $null

try {
    '1. opening firewall temporarily...'
    az postgres flexible-server firewall-rule create -g $RG -s $SRV -n $TEMP `
        --start-ip-address 0.0.0.0 --end-ip-address 255.255.255.255 -o tsv --query name

    '2. connecting (this is the actual test)...'
    $realIp = (psql "host=$SRV.postgres.database.azure.com port=5432 dbname=dc_tool user=dctooladmin sslmode=require" `
                    -tAc 'select inet_client_addr();').Trim()
    "   psql exit code: $LASTEXITCODE"
    "   Azure sees this machine as: $realIp"
}
finally {
    '3. closing firewall again...'
    az postgres flexible-server firewall-rule delete -g $RG -s $SRV -n $TEMP --yes
    '   temp rule removed.'
}

if (-not $realIp) {
    ''
    'No IP returned - the connection itself failed. Note that a timeout here is'
    'NOT evidence of a corporate network block: Azure drops firewall-rejected'
    'packets silently, so the two look identical. Do not trust Test-NetConnection'
    'either, it flaps. Check the psql error text above instead.'
    exit 1
}

if ($Pin) {
    "4. pinning $realIp as rule '$RuleName'..."
    az postgres flexible-server firewall-rule create -g $RG -s $SRV -n $RuleName `
        --start-ip-address $realIp -o table
} else {
    ''
    "To keep standing access, re-run with:  .\scripts\dbdiag.ps1 -Pin"
    'Re-run whenever your IP rotates - these addresses are dynamic and have'
    'moved twice in two days.'
}
