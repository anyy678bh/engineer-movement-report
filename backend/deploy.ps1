$ErrorActionPreference = 'Stop'

Write-Host 'Checking toolchain...'

$aws = Get-Command aws -ErrorAction SilentlyContinue
$sam = Get-Command sam -ErrorAction SilentlyContinue

if (-not $aws) {
  Write-Host 'AWS CLI is required but was not found. Install it first.' -ForegroundColor Red
  exit 1
}

if (-not $sam) {
  Write-Host 'AWS SAM CLI is required but was not found. Install it first.' -ForegroundColor Red
  exit 1
}

Write-Host 'Building SAM application...'
sam build

Write-Host 'Deploying SAM application...'
sam deploy --config-file samconfig.toml --config-env default
