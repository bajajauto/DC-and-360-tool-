param(
  [Parameter(Mandatory = $true)][string]$TemplatePath,
  [Parameter(Mandatory = $true)][string]$OutputPath,
  [Parameter(Mandatory = $true)][string]$ReplacementsPath
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Escape-XmlText {
  param([AllowNull()][string]$Value)

  if ($null -eq $Value) { return '' }
  return [System.Security.SecurityElement]::Escape($Value)
}

$payload = Get-Content -LiteralPath $ReplacementsPath -Raw | ConvertFrom-Json
$tokens = @{}
foreach ($property in $payload.tokens.PSObject.Properties) {
  $tokens[$property.Name] = [string]$property.Value
}

$nominatedCounts = @()
if ($payload.nominatedCounts) {
  foreach ($count in $payload.nominatedCounts) {
    $nominatedCounts += [string]$count
  }
}

$scoreFallback = '-'
if ($payload.scoreFallback) {
  $scoreFallback = [string]$payload.scoreFallback
}
$outputDirectory = [System.IO.Path]::GetDirectoryName($OutputPath)
$tempRoot = Join-Path $outputDirectory ([System.IO.Path]::GetRandomFileName())

try {
  New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
  New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

  [System.IO.Compression.ZipFile]::ExtractToDirectory($TemplatePath, $tempRoot)

  $slideDirectory = Join-Path $tempRoot 'ppt\slides'
  $slideFiles = Get-ChildItem -LiteralPath $slideDirectory -Filter 'slide*.xml'
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)

  foreach ($slideFile in $slideFiles) {
    $xml = [System.IO.File]::ReadAllText($slideFile.FullName)

    $xml = [regex]::Replace($xml, '\{\{(?s:.*?)\}\}', {
      param($match)

      $plainToken = [regex]::Replace($match.Value, '<[^>]+>', '')
      $plainToken = [System.Net.WebUtility]::HtmlDecode($plainToken)
      $key = $plainToken -replace '^\s*\{\{\s*', ''
      $key = $key -replace '\s*\}\}\s*$', ''
      $key = $key.Trim()

      if ($tokens.ContainsKey($key)) {
        return Escape-XmlText $tokens[$key]
      }

      return '-'
    })

    if ($slideFile.Name -eq 'slide5.xml' -and $nominatedCounts.Count -gt 0) {
      $script:nIndex = 0
      $xml = [regex]::Replace($xml, '\[N\]', {
        param($match)

        if ($script:nIndex -lt $nominatedCounts.Count) {
          $value = $nominatedCounts[$script:nIndex]
          $script:nIndex += 1
          return Escape-XmlText $value
        }

        return '-'
      })
    }

    $xml = [regex]::Replace($xml, '\[X\.X\]', (Escape-XmlText $scoreFallback))
    [System.IO.File]::WriteAllText($slideFile.FullName, $xml, $utf8NoBom)
  }

  if (Test-Path -LiteralPath $OutputPath) {
    Remove-Item -LiteralPath $OutputPath -Force
  }

  [System.IO.Compression.ZipFile]::CreateFromDirectory($tempRoot, $OutputPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)
}
finally {
  if (Test-Path -LiteralPath $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
  }
}
