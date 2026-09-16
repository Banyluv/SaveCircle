# Builds the SaveCircle Android APK and publishes it to apk\ (which the backend
# serves as /downloads/savecircle.apk).
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1 -Release
#   powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1 -Release -ApiUrl https://your-app.onrender.com
#
# The APK does NOT contain a backend: a phone cannot run Node/Postgres, so the
# app must call a hosted API. -ApiUrl is baked into the bundle at build time.
# Without it the installed app opens but cannot load data; the login screen then
# offers a server-address field, which is also how an installed APK gets
# re-pointed at a different server without rebuilding.
#
# -Release produces a signed release APK using android\keystore.properties
# (see scripts\create-keystore.ps1). That is the build to sideload or ship:
# the default debug APK carries the shared, public debug key instead.
param(
    [string]$ApiUrl = '',
    [switch]$Release
)

$ErrorActionPreference = 'Stop'
$root = 'C:\SaveCircle'
Set-Location $root

# --- Toolchain -------------------------------------------------------------
if (-not $env:JAVA_HOME) { $env:JAVA_HOME = 'C:\Program Files\Java\jdk-21' }
$env:ANDROID_HOME = 'C:\Android\sdk'
$env:ANDROID_SDK_ROOT = 'C:\Android\sdk'

if (-not (Test-Path $env:JAVA_HOME)) { throw "JAVA_HOME not found: $env:JAVA_HOME" }
if (-not (Test-Path $env:ANDROID_HOME)) { throw "Android SDK not found: $env:ANDROID_HOME" }

Write-Host "JAVA_HOME    = $env:JAVA_HOME"
Write-Host "ANDROID_HOME = $env:ANDROID_HOME"

# --- 1. Build the web bundle ----------------------------------------------
# VITE_API_URL is read by src/utils/api.js and compiled into the bundle.
if ($ApiUrl) {
    $env:VITE_API_URL = $ApiUrl.TrimEnd('/')
    Write-Host "API URL      = $env:VITE_API_URL"
} else {
    Remove-Item Env:\VITE_API_URL -ErrorAction SilentlyContinue
    Write-Warning 'No -ApiUrl given. The APK will build but cannot reach a server until rebuilt with one.'
}

Write-Host "`n[1/5] Building web bundle..."
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Web build failed' }

# --- 2. Copy web assets into the native project ---------------------------
Write-Host "`n[2/5] Syncing web assets into the Android project..."
npx cap sync android
if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed' }

# --- 3. Signing material (release only) -----------------------------------
if ($Release) {
    $propsPath = Join-Path $root 'android\keystore.properties'
    if (-not (Test-Path $propsPath)) {
        throw "A release build must be signed. Missing $propsPath. Run: powershell -ExecutionPolicy Bypass -File scripts\create-keystore.ps1"
    }

    # Read just enough of the properties file to confirm the keystore really is
    # where it claims to be: Gradle's own "file not found" for a bad path is far
    # less obvious than this.
    $props = @{}
    Get-Content $propsPath | Where-Object { $_ -match '^\s*[^#\s][^=]*=' } | ForEach-Object {
        $pair = $_ -split '=', 2
        $props[$pair[0].Trim()] = $pair[1].Trim()
    }
    $storeFile = Join-Path (Join-Path $root 'android') ($props['storeFile'] -replace '/', '\')
    if (-not (Test-Path $storeFile)) { throw "Keystore not found: $storeFile" }
    Write-Host "`n[3/5] Signing with keystore $($props['storeFile']) (alias $($props['keyAlias']))"
} else {
    Write-Host "`n[3/5] Debug build - signed with the shared Android debug key."
}

# --- 4. Compile the APK ---------------------------------------------------
$variant = if ($Release) { 'assembleRelease' } else { 'assembleDebug' }
Write-Host "`n[4/5] Compiling APK ($variant)..."
Push-Location (Join-Path $root 'android')
try {
    .\gradlew.bat $variant --no-daemon
    if ($LASTEXITCODE -ne 0) { throw "Gradle $variant failed" }
} finally {
    Pop-Location
}

# --- 5. Verify the signature (release) and publish to apk\ ----------------
$apkName = if ($Release) { 'app-release.apk' } else { 'app-debug.apk' }
$apkDir = Join-Path $root "android\app\build\outputs\apk\$($variant.Replace('assemble','').ToLower())"
$apkPath = Join-Path $apkDir $apkName
if (-not (Test-Path $apkPath)) {
    # Layout differs between Gradle versions; fall back to a search.
    $found = Get-ChildItem $apkDir -Recurse -Filter *.apk -ErrorAction SilentlyContinue |
             Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $found) { throw "APK not found under $apkDir" }
    $apkPath = $found.FullName
}

if ($Release) {
    # An unsigned release APK is silently uninstallable, so verify before
    # publishing rather than shipping a file nobody can open.
    $apksigner = Get-ChildItem (Join-Path $env:ANDROID_HOME 'build-tools') -Directory -ErrorAction SilentlyContinue |
                 Sort-Object Name -Descending |
                 ForEach-Object { Join-Path $_.FullName 'apksigner.bat' } |
                 Where-Object { Test-Path $_ } |
                 Select-Object -First 1
    if (-not $apksigner) { throw 'apksigner.bat not found in build-tools; cannot verify the APK signature.' }
    Write-Host "`n[5/5] Verifying signature..."
    & $apksigner verify --print-certs $apkPath
    if ($LASTEXITCODE -ne 0) {
        throw 'APK signature verification FAILED. Run scripts\create-keystore.ps1 and rebuild.'
    }
}

$destDir = Join-Path $root 'apk'
New-Item -ItemType Directory -Force -Path $destDir | Out-Null
$dest = Join-Path $destDir 'savecircle.apk'
Copy-Item $apkPath $dest -Force

$sizeMb = [math]::Round((Get-Item $dest).Length / 1MB, 1)
Write-Host "`nAPK ready" -ForegroundColor Green
Write-Host "  variant: $(if ($Release) { 'release (signed)' } else { 'debug' })"
Write-Host "  source : $apkPath"
Write-Host "  served : $dest  ($sizeMb MB)"
Write-Host "  download URL: /downloads/savecircle.apk"

# --- 6. Publish the version manifest --------------------------------------
# The server reports this on /api/app/version so an installed app can tell that
# a newer build exists.
#
# A DEBUG build never overwrites an existing manifest: debug APKs are locally
# tested binaries, and letting one clobber the release metadata would advertise
# a debug build to every real installation. Delete apk\version.json by hand if
# you genuinely want to reset it.
$manifestPath = Join-Path $destDir 'version.json'
$isDebug = -not $Release

if ($isDebug -and (Test-Path $manifestPath)) {
    Write-Host "`n  manifest: kept existing version.json (debug build does not overwrite release metadata)"
} else {
    $gradleText = Get-Content (Join-Path $root 'android\app\build.gradle') -Raw
    $code = [int]([regex]::Match($gradleText, 'versionCode\s+(\d+)')).Groups[1].Value
    $nameM = [regex]::Match($gradleText, 'versionName\s+"([^"]*)"')
    $vname = if ($nameM.Success) { $nameM.Groups[1].Value } else { '1.0' }
    $sha = (Get-FileHash $dest -Algorithm SHA256).Hash.ToLower()

    $manifest = [ordered]@{
        versionCode = $code
        versionName = $vname
        sha256      = $sha
        notes       = ''
        variant     = if ($Release) { 'release' } else { 'debug' }
        releasedAt  = (Get-Date).ToUniversalTime().ToString('o')
    }
    $manifest | ConvertTo-Json | Set-Content -Path $manifestPath -Encoding UTF8

    Write-Host "  version : $vname (code $code)"
    Write-Host "  sha256  : $sha"
    Write-Host "  manifest: $manifestPath"
}
