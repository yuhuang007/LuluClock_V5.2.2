[CmdletBinding()]
param(
    [string]$Cli = 'arduino-cli',
    [string]$ConfigFile,
    [string]$OutputDir = (Join-Path $PSScriptRoot 'build')
)
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    throw 'Set -OutputDir to a nonempty filesystem path, or omit it to use the default.'
}
$provider = $drive = $null
$outputPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputDir, [ref]$provider, [ref]$drive)
if ($provider.Name -ne 'FileSystem') { throw 'Set -OutputDir to a filesystem path.' }

# The Windows Xtensa linker can mangle non-ASCII output paths.
$isWindowsHost = [IO.Path]::DirectorySeparatorChar -eq '\'
if ($isWindowsHost -and $outputPath -match '[^\x20-\x7E]') {
    if ($PSBoundParameters.ContainsKey('OutputDir')) {
        throw 'Arduino ESP32 on Windows needs an ASCII-only build output path. Use -OutputDir with a writable path such as C:\lulu-build.'
    }
    $outputPath = $null
    foreach ($temp in @($env:TEMP, $env:TMP, [IO.Path]::GetTempPath())) {
        if (-not $temp -or -not [IO.Path]::IsPathRooted($temp)) { continue }
        $temp = [IO.Path]::GetFullPath($temp)
        if ($temp -match '[^\x20-\x7E]' -or -not [IO.Directory]::Exists($temp)) { continue }
        try {
            $outputPath = [IO.Directory]::CreateDirectory((Join-Path $temp ('lululock-build-' + [guid]::NewGuid().ToString('N')))).FullName
            break
        } catch [System.UnauthorizedAccessException], [System.IO.IOException] { continue }
    }
    if (-not $outputPath) {
        throw 'No writable ASCII-only temporary directory was found. Use -OutputDir with a writable ASCII-only path.'
    }
    Write-Warning "Using temporary build directory: $outputPath"
}

$cliPath = (Get-Command $Cli -CommandType Application -ErrorAction Stop).Source
$configArgs = @()
if ($ConfigFile) { $configArgs = @('--config-file', $ConfigFile) }
$fqbn = 'esp32:esp32:esp32s3:CDCOnBoot=default,USBMode=hwcdc,UploadMode=default,FlashMode=qio,FlashSize=16M,PSRAM=opi,PartitionScheme=app3M_fat9M_16MB,UploadSpeed=115200'

# Protect a shared default or explicitly chosen output without locking other build directories.
$lockPath = $outputPath.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
if ($isWindowsHost) { $lockPath = $lockPath.ToUpperInvariant() }
$sha = [Security.Cryptography.SHA256]::Create()
try {
    $key = [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($lockPath))).Replace('-', '')
} finally { $sha.Dispose() }
$lock = [Threading.Mutex]::new($false, "LuluClock.Build.$key")
$locked = $false
try {
    try { $locked = $lock.WaitOne(0) } catch [Threading.AbandonedMutexException] { $locked = $true }
    if (-not $locked) {
        throw "Another firmware build is using '$outputPath'. Wait for it to finish or use a different -OutputDir."
    }
    & $cliPath @configArgs compile --fqbn $fqbn --build-path $outputPath (Join-Path $PSScriptRoot 'JianClock')
    if ($LASTEXITCODE -ne 0) { throw "Arduino compilation failed (exit $LASTEXITCODE)." }
    if (!(Test-Path -LiteralPath (Join-Path $outputPath 'JianClock.ino.bin') -PathType Leaf)) {
        throw 'Arduino compilation did not produce the application image.'
    }
} finally {
    if ($locked) { $lock.ReleaseMutex() }
    $lock.Dispose()
}

Write-Host "Build output: $outputPath"
Write-Host 'For App OTA, use JianClock.ino.bin only. No upload was performed.'
