[CmdletBinding()]
param(
    [string]$Cli = 'arduino-cli',
    [string]$ConfigFile,
    [string]$OutputDir = (Join-Path $PSScriptRoot 'build')
)
$ErrorActionPreference = 'Stop'
$cliPath = (Get-Command $Cli -CommandType Application -ErrorAction Stop).Source
$configArgs = @()
if ($ConfigFile) { $configArgs = @('--config-file', $ConfigFile) }
$fqbn = 'esp32:esp32:esp32s3:CDCOnBoot=default,USBMode=hwcdc,UploadMode=default,FlashMode=qio,FlashSize=16M,PSRAM=opi,PartitionScheme=app3M_fat9M_16MB,UploadSpeed=115200'
$outputPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputDir)

& $cliPath @configArgs compile --fqbn $fqbn --build-path $outputPath (Join-Path $PSScriptRoot 'JianClock')
if ($LASTEXITCODE -ne 0) { throw "Arduino compilation failed (exit $LASTEXITCODE)." }
if (!(Test-Path -LiteralPath (Join-Path $outputPath 'JianClock.ino.bin') -PathType Leaf)) {
    throw 'Arduino compilation did not produce the application image.'
}

Write-Host "Build output: $outputPath"
Write-Host 'For App OTA, use JianClock.ino.bin only. No upload was performed.'
