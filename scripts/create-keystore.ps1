# Creates the release signing keystore for the SaveCircle Android app and writes
# android/keystore.properties next to it (the file Gradle reads).
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\create-keystore.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\create-keystore.ps1 -Password 'SomeStrongPassw0rd'
#
# Both outputs are gitignored. BACK THEM UP somewhere safe: Android refuses to
# install an update over an app unless it is signed with the same key, so losing
# this keystore means every existing install must be uninstalled by hand - and
# a store listing (Play Console) can never be updated again.
#
# Re-running is safe: an existing keystore is left untouched.
param(
    [string]$Alias = 'savecircle',
    [string]$Password = 'SaveCircleRelease2026',
    [string]$DistinguishedName = 'CN=SaveCircle, OU=SaveCircle Engineering, O=SaveCircle, L=Calabar, ST=Cross River, C=NG',
    [int]$ValidityDays = 10000
)

$ErrorActionPreference = 'Stop'
$root = 'C:\SaveCircle'
$keystoreDir = Join-Path $root 'android\keystore'
$keystorePath = Join-Path $keystoreDir 'savecircle-release.jks'
$propsPath = Join-Path $root 'android\keystore.properties'

# --- Locate keytool --------------------------------------------------------
if (-not $env:JAVA_HOME) { $env:JAVA_HOME = 'C:\Program Files\Java\jdk-21' }
$keytool = Join-Path $env:JAVA_HOME 'bin\keytool.exe'
if (-not (Test-Path $keytool)) {
    $cmd = Get-Command keytool -ErrorAction SilentlyContinue
    if (-not $cmd) { throw "keytool not found. Set JAVA_HOME to a JDK, or add keytool to PATH." }
    $keytool = $cmd.Source
}
Write-Host "keytool      = $keytool"

if (Test-Path $keystorePath) {
    Write-Host "Keystore already exists, leaving it alone: $keystorePath" -ForegroundColor Yellow
} else {
    New-Item -ItemType Directory -Force -Path $keystoreDir | Out-Null
    Write-Host "Generating keystore: $keystorePath"
    # PKCS12 wants the key password to match the store password; keytool warns
    # otherwise, and some JDKs reject it outright.
    & $keytool -genkeypair -keystore $keystorePath -storetype PKCS12 `
        -alias $Alias -keyalg RSA -keysize 2048 -validity $ValidityDays `
        -storepass $Password -keypass $Password -dname $DistinguishedName
    if ($LASTEXITCODE -ne 0) { throw "keytool failed (exit $LASTEXITCODE)" }
}

# --- Write the properties file Gradle reads -------------------------------
$props = @(
    '# Release signing credentials for the SaveCircle Android app.',
    '#',
    '# This file IS gitignored: it holds the private keystore password, so it must',
    '# never be committed. Keep a copy in a password manager / secure backup - if the',
    '# keystore and this password are lost you cannot ship an update that existing',
    '# installs will accept (Android only trusts APKs signed with the same key).',
    '#',
    '# Paths are resolved relative to the android/ project directory.',
    'storeFile=keystore/savecircle-release.jks',
    "storePassword=$Password",
    "keyAlias=$Alias",
    "keyPassword=$Password"
)
Set-Content -Path $propsPath -Value $props -Encoding ASCII
Write-Host "Wrote          : $propsPath"

# --- Confirm it is usable -------------------------------------------------
& $keytool -list -keystore $keystorePath -storepass $Password -alias $Alias | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Keystore was created but cannot be read back with that password.' }

Write-Host "`nKeystore ready." -ForegroundColor Green
Write-Host "  keystore : $keystorePath"
Write-Host "  alias    : $Alias"
Write-Host "  next     : scripts\build-apk.ps1 -Release"