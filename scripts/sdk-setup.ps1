# Installs the Android SDK packages needed to build the SaveCircle APK.
# Safe to re-run; sdkmanager skips already-installed packages.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$sdk = 'C:\Android\sdk'
$log = "$env:TEMP\sdk-setup.log"

function Log($m) { $m | Tee-Object -FilePath $log -Append | Out-Null; Write-Host $m }

"=== Android SDK setup $(Get-Date -Format s) ===" | Set-Content $log

# Locate a JDK. sdkmanager refuses to run without JAVA_HOME.
if (-not $env:JAVA_HOME) {
    $candidates = @()
    $javac = Get-Command javac -ErrorAction SilentlyContinue
    if ($javac) {
        # javac lives in <jdk>\bin
        $candidates += (Split-Path (Split-Path $javac.Source -Parent) -Parent)
    }
    $candidates += (Get-ChildItem 'C:\Program Files\Java','C:\Program Files\Eclipse Adoptium','C:\Program Files\Microsoft' -Directory -ErrorAction SilentlyContinue |
                    Where-Object { $_.Name -match 'jdk|jre' } | Select-Object -ExpandProperty FullName)
    foreach ($c in $candidates) {
        if ($c -and (Test-Path (Join-Path $c 'bin\javac.exe'))) { $env:JAVA_HOME = $c; break }
        if ($c -and (Test-Path (Join-Path $c 'bin'))) { $env:JAVA_HOME = $c; break }
    }
}
Log "JAVA_HOME=$env:JAVA_HOME"
if (-not $env:JAVA_HOME) { Log 'FATAL: could not locate a JDK'; exit 1 }

$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$sdkmanager = Join-Path $sdk 'cmdline-tools\latest\bin\sdkmanager.bat'
if (-not (Test-Path $sdkmanager)) { Log "FATAL: sdkmanager not found at $sdkmanager"; exit 1 }

# Packages: build-tools + platform for compileSdk, and platform-tools (adb).
$packages = @(
    'platform-tools',
    'platforms;android-35',
    'build-tools;35.0.0'
)
Log ("Installing: " + ($packages -join ', '))

# Accept all licences non-interactively (requires the 'yes' stream).
$yes = ("y`n" * 200)
$yes | & $sdkmanager --sdk_root=$sdk --licenses 2>&1 | Add-Content $log
$yes | & $sdkmanager --sdk_root=$sdk @packages 2>&1 | Add-Content $log

$code = $LASTEXITCODE
Log "sdkmanager exit code: $code"

Log '--- installed platforms ---'
Get-ChildItem (Join-Path $sdk 'platforms') -Directory -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name | Add-Content $log
Log '--- installed build-tools ---'
Get-ChildItem (Join-Path $sdk 'build-tools') -Directory -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name | Add-Content $log

Log '=== DONE ==='
exit $code
