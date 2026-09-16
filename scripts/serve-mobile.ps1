# Makes the SaveCircle server reachable from a phone on the same Wi-Fi network.
#
# Symptom this fixes:
#   "This site can't be reached — localhost refused to connect" on the phone.
#
# Cause: "localhost" means "this device". On a phone that points at the phone
# itself, not at your PC. The phone must use your PC's LAN IP address, and
# Windows Firewall must allow inbound connections on the port (Wi-Fi networks are
# usually classed "Public", where inbound traffic is blocked by default).
#
# MUST BE RUN AS ADMINISTRATOR to add the firewall rules.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\serve-mobile.ps1

$ErrorActionPreference = 'Continue'

Write-Host "`n=== SaveCircle mobile access setup ===" -ForegroundColor Cyan

# --- 1. Find this PC's LAN IP ---------------------------------------------
$lanIp = (Get-NetIPAddress -AddressFamily IPv4 |
          Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
          Select-Object -First 1 -ExpandProperty IPAddress)

if (-not $lanIp) {
    Write-Host "Could not detect a LAN IP. Is Wi-Fi connected?" -ForegroundColor Red
    exit 1
}
Write-Host "This PC's LAN IP: $lanIp"

# --- 2. Open the firewall for the app ports --------------------------------
# Ports: 5099 = production-style server (API + built UI), 3000 = Vite dev, 5000 = backend dev
$ports = @(
    @{ Port = 5099; Name = 'SaveCircle Web (5099)' },
    @{ Port = 3000; Name = 'SaveCircle Vite dev (3000)' },
    @{ Port = 5000; Name = 'SaveCircle API dev (5000)' }
)

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "`nNot running as Administrator — cannot add firewall rules." -ForegroundColor Yellow
    Write-Host "Re-run this script from an ADMIN PowerShell, or run this command yourself:" -ForegroundColor Yellow
    foreach ($p in $ports) {
        Write-Host ("  New-NetFirewallRule -DisplayName '{0}' -Direction Inbound -Action Allow -Protocol TCP -LocalPort {1} -Profile Any -RemoteAddress LocalSubnet" -f $p.Name, $p.Port) -ForegroundColor Gray
    }
} else {
    foreach ($p in $ports) {
        $existing = Get-NetFirewallRule -DisplayName $p.Name -ErrorAction SilentlyContinue
        if ($existing) {
            Write-Host "  rule already exists: $($p.Name)"
        } else {
            try {
                # RemoteAddress LocalSubnet limits access to devices on the same
                # network, rather than exposing the port to the whole internet.
                New-NetFirewallRule -DisplayName $p.Name -Direction Inbound -Action Allow `
                    -Protocol TCP -LocalPort $p.Port -Profile Any -RemoteAddress LocalSubnet | Out-Null
                Write-Host "  added inbound rule for port $($p.Port)" -ForegroundColor Green
            } catch {
                Write-Host "  FAILED to add rule for port $($p.Port): $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
}

# --- 3. Show the phone URLs ------------------------------------------------
Write-Host "`n=== Open these on your phone (same Wi-Fi as this PC) ===" -ForegroundColor Cyan
Write-Host "  Web app        : http://${lanIp}:5099/" -ForegroundColor White
Write-Host "  APK download   : http://${lanIp}:5099/downloads/savecircle.apk" -ForegroundColor White
Write-Host "  Health check   : http://${lanIp}:5099/api/health" -ForegroundColor Gray

Write-Host "`n=== Checklist if it still fails ===" -ForegroundColor Cyan
Write-Host "  1. Phone and PC must be on the SAME Wi-Fi (not mobile data, not a guest network)."
Write-Host "  2. Run this script as Administrator so the firewall rules are actually added."
Write-Host "  3. Some routers enable 'AP isolation' / 'client isolation', which blocks"
Write-Host "     devices from talking to each other. Turn it off in the router settings."
Write-Host "  4. Corporate/public Wi-Fi often blocks device-to-device traffic entirely."
Write-Host "     In that case use a phone hotspot, or deploy to Render and use that URL."

Write-Host "`n=== The APK must be built with this URL baked in ===" -ForegroundColor Cyan
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1 -ApiUrl http://${lanIp}:5099" -ForegroundColor White
Write-Host ""
