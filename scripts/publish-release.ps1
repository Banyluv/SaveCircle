# Publishes a new SaveCircle release so installed Android apps are offered the
# update.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\publish-release.ps1 -Notes "Fixed X"
#   powershell -ExecutionPolicy Bypass -File scripts\publish-release.ps1 -VersionName 1.1 -ApiUrl https://savecircle.onrender.com
#
# What it does, in order:
#   1. bumps versionCode/versionName in android\app\build.gradle
#      (versionCode MUST increase — it is the only field Android compares)
#   2. builds the web bundle + the signed release APK with that version
#   3. writes apk\version.json with the new version, the APK's SHA-256 and notes
#
# The server reads apk\version.json (see backend/config/appRelease.js) and
# reports it on GET /api/app/version. An installed app compares that with the
# versionCode baked into itself and prompts the user when the server is ahead.
param(
    [string]$VersionName = '',
    [string]$Notes = '',
    [string]$ApiUrl = '',
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$root = 'C:\SaveCircle'
Set-Location $root

$gradleFile = Join-Path $root 'android\app\build.gradle'
$manifestPath = Join-Path $root 'apk\version.json'

if (-not (Test-Path $gradleFile)) { throw "Not found: $gradleFile" }
$gradle = Get-Content $gradleFile -Raw

# --- Read the current version out of build.gradle -------------------------
$codeMatch = [regex]::Match($gradle, 'versionCode\s+(\d+)')
$nameMatch = [regex]::Match($gradle, 'versionName\s+"([^"]*)"')
if (-not $codeMatch.Success) { throw 'Could not find versionCode in android\app\build.gradle' }

$currentCode = [int]$codeMatch.Groups[1].Value
$currentName = if ($nameMatch.Success) { $nameMatch.Groups[1].Value } else { '1.0' }

$newCode = $currentCode + 1

# Auto-derive a name like 1.1 from the code when one was not supplied, so the
# user always sees a version that moved.
if (-not $VersionName) {
    $major = [int][math]::Floor($newCode / 10)
    $minor = $newCode % 10
    $VersionName = "$major.$minor"
}

Write-Host "Version: $currentName ($currentCode)  ->  $VersionName ($newCode)"

# --- 1. Bump the version in build.gradle ----------------------------------
$gradle = $gradle -replace 'versionCode\s+\d+', "versionCode $newCode"
$gradle = $gradle -replace 'versionName\s+"[^"]*"', "versionName `"$VersionName`""
Set-Content -Path $gradleFile -Value $gradle -Encoding UTF8
Write-Host "Updated $gradleFile"

# --- 2. Build the APK ------------------------------------------------------
if ($SkipBuild) {
    Write-Host 'Skipping the APK build (-SkipBuild). version.json will refer to the existing binary.'
} else {
    $args = @('-ExecutionPolicy', 'Bypass', '-File', (Join-Path $root 'scripts\build-apk.ps1'), '-Release')
    if ($ApiUrl) { $args += @('-ApiUrl', $ApiUrl) }
    Write-Host "`nBuilding release APK..."
    & powershell @args
    if ($LASTEXITCODE -ne 0) { throw 'APK build failed' }
}

# --- 3. Publish the version manifest --------------------------------------
$apkPath = Join-Path $root 'apk\savecircle.apk'
if (-not (Test-Path $apkPath)) {
    throw "No APK at $apkPath — build first (omit -SkipBuild), then re-run this script."
}

$sha = (Get-FileHash $apkPath -Algorithm SHA256).Hash.ToLower()
$sizeMb = [math]::Round((Get-Item $apkPath).Length / 1MB, 2)

$manifest = [ordered]@{
    versionCode = $newCode
    versionName = $VersionName
    sha256      = $sha
    notes       = $Notes
    releasedAt  = (Get-Date).ToUniversalTime().ToString('o')
}

$manifest | ConvertTo-Json | Set-Content -Path $manifestPath -Encoding UTF8

Write-Host "`n=== Published ==="
Write-Host "APK       : $apkPath ($sizeMb MB)"
Write-Host "SHA-256   : $sha"
Write-Host "Manifest  : $manifestPath"
Write-Host ''
Write-Host 'Commit apk\version.json so the hosted server advertises this version.'
Write-Host 'Upload apk\savecircle.apk to your release host and set APK_URL to its URL,'
Write-Host 'or leave APK_URL unset to serve the binary from this server.'
