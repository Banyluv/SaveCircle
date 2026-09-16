# Verification script for the auth/scoping changes.
# Run:  powershell -ExecutionPolicy Bypass -File scripts\verify-scoping.ps1
$ErrorActionPreference = 'Continue'
$base = 'http://127.0.0.1:5099'

function Login($email, $password) {
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    try {
        $r = Invoke-WebRequest "$base/api/auth/login" -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
        return $r.Content | ConvertFrom-Json
    } catch { return $null }
}

function StatusOf($method, $path, $token, $body) {
    $headers = @{}
    if ($token) { $headers['Authorization'] = "Bearer $token" }
    try {
        if ($body) {
            $r = Invoke-WebRequest "$base$path" -Method $method -Headers $headers -Body $body -ContentType 'application/json' -UseBasicParsing
        } else {
            $r = Invoke-WebRequest "$base$path" -Method $method -Headers $headers -UseBasicParsing
        }
        return $r.StatusCode
    } catch {
        return [int]$_.Exception.Response.StatusCode.value__
    }
}

Write-Host "`n=== 1. Previously-unauthenticated write endpoints are now protected ===" -ForegroundColor Cyan
foreach ($ep in 'groups', 'logs') {
    $code = StatusOf 'POST' "/api/$ep/sync" $null '[]'
    $verdict = if ($code -eq 401) { 'OK (401 blocked)' } else { "FAIL (got $code)" }
    Write-Host ("  POST /api/{0}/sync  -> {1}  {2}" -f $ep, $code, $verdict)
}

Write-Host "`n=== 2. Previously-unauthenticated log read is now protected ===" -ForegroundColor Cyan
$code = StatusOf 'GET' '/api/logs' $null $null
Write-Host ("  GET  /api/logs       -> {0}  {1}" -f $code, $(if ($code -eq 401) { 'OK (401 blocked)' } else { "FAIL (got $code)" }))

Write-Host "`n=== 3. Logins still work ===" -ForegroundColor Cyan
$super = Login 'superadmin@savecircle.com' 'superadmin123'
$admin1 = Login 'admin1@savecircle.com' 'admin123'
$admin2 = Login 'admin2@savecircle.com' 'admin123'
Write-Host ("  superadmin : token={0} groupId={1}" -f [bool]$super.token, $super.groupId)
Write-Host ("  admin1     : token={0} groupId={1}" -f [bool]$admin1.token, $admin1.groupId)
Write-Host ("  admin2     : token={0} groupId={1}" -f [bool]$admin2.token, $admin2.groupId)

Write-Host "`n=== 4. Central account endpoint ===" -ForegroundColor Cyan
$code = StatusOf 'GET' '/api/settings/central-account' $null $null
Write-Host ("  GET (no token)          -> {0}  {1}" -f $code, $(if ($code -eq 401) { 'OK (401 blocked)' } else { "FAIL (got $code)" }))

$code = StatusOf 'GET' '/api/settings/central-account' $super.token $null
Write-Host ("  GET (superadmin)        -> {0}" -f $code)
if ($code -eq 200) {
    $acct = (Invoke-WebRequest "$base/api/settings/central-account" -Headers @{ Authorization = "Bearer $($super.token)" } -UseBasicParsing).Content | ConvertFrom-Json
    Write-Host ("      initial: active={0} bank='{1}' number='{2}'" -f $acct.data.active, $acct.data.bankName, $acct.data.accountNumber)
}

# A group admin may READ the central account (members must know where to pay)...
$code = StatusOf 'GET' '/api/settings/central-account' $admin1.token $null
Write-Host ("  GET (group admin)       -> {0}  {1}" -f $code, $(if ($code -eq 200) { 'OK (readable so members know where to pay)' } else { "unexpected" }))

# ...but must NOT be able to change it.
$payload = '{"bankName":"Hack Bank","accountNumber":"000","accountName":"X","active":true}'
$code = StatusOf 'PUT' '/api/settings/central-account' $admin1.token $payload
Write-Host ("  PUT (group admin)       -> {0}  {1}" -f $code, $(if ($code -eq 403) { 'OK (403 forbidden)' } else { "FAIL (got $code)" }))

Write-Host "`n=== 5. superadmin can set + activate the central account ===" -ForegroundColor Cyan
$payload = '{"bankName":"Zenith Bank","accountNumber":"1234567890","accountName":"SaveCircle Central Pool","note":"Platform central account","active":true}'
$code = StatusOf 'PUT' '/api/settings/central-account' $super.token $payload
Write-Host ("  PUT (superadmin)        -> {0}" -f $code)
if ($code -eq 200) {
    $acct2 = (Invoke-WebRequest "$base/api/settings/central-account" -Headers @{ Authorization = "Bearer $($super.token)" } -UseBasicParsing).Content | ConvertFrom-Json
    Write-Host ("      now: active={0} bank='{1}' number='{2}' name='{3}'" -f $acct2.data.active, $acct2.data.bankName, $acct2.data.accountNumber, $acct2.data.accountName)
}

Write-Host "`n=== 6. Incomplete central account is rejected when activated ===" -ForegroundColor Cyan
$bad = '{"bankName":"","accountNumber":"","accountName":"","active":true}'
$code = StatusOf 'PUT' '/api/settings/central-account' $super.token $bad
Write-Host ("  PUT (empty + active)    -> {0}  {1}" -f $code, $(if ($code -eq 400) { 'OK (400 validation)' } else { "FAIL (got $code)" }))

Write-Host "`n=== 7. Group scoping: admin1 must not see admin2's borrowers ===" -ForegroundColor Cyan
foreach ($pair in @(@('admin1', $admin1), @('admin2', $admin2), @('superadmin', $super))) {
    $name = $pair[0]; $u = $pair[1]
    try {
        $r = Invoke-WebRequest "$base/api/loans/borrowers" -Headers @{ Authorization = "Bearer $($u.token)" } -UseBasicParsing
        $d = $r.Content | ConvertFrom-Json
        $names = ($d.data | ForEach-Object { $_.name }) -join ', '
        Write-Host ("  {0,-11} sees {1} borrower(s): {2}" -f $name, $d.data.Count, $names)
    } catch {
        Write-Host ("  {0,-11} -> {1}" -f $name, [int]$_.Exception.Response.StatusCode.value__)
    }
}

Write-Host "`n=== 8. Group scoping: logs are filtered per group ===" -ForegroundColor Cyan
foreach ($pair in @(@('admin1', $admin1), @('admin2', $admin2), @('superadmin', $super))) {
    $name = $pair[0]; $u = $pair[1]
    try {
        $r = Invoke-WebRequest "$base/api/logs" -Headers @{ Authorization = "Bearer $($u.token)" } -UseBasicParsing
        $d = $r.Content | ConvertFrom-Json
        $groups = ($d | ForEach-Object { $_.groupName } | Sort-Object -Unique) -join ' | '
        Write-Host ("  {0,-11} {1} log(s), groups: {2}" -f $name, $d.Count, $groups)
    } catch {
        Write-Host ("  {0,-11} -> {1}" -f $name, [int]$_.Exception.Response.StatusCode.value__)
    }
}

Write-Host "`n=== 9. Groups visible per role ===" -ForegroundColor Cyan
foreach ($pair in @(@('admin1', $admin1), @('admin2', $admin2), @('superadmin', $super))) {
    $name = $pair[0]; $u = $pair[1]
    try {
        $r = Invoke-WebRequest "$base/api/groups" -Headers @{ Authorization = "Bearer $($u.token)" } -UseBasicParsing
        $d = $r.Content | ConvertFrom-Json
        $gnames = ($d | ForEach-Object { $_.name }) -join ', '
        Write-Host ("  {0,-11} sees {1} group(s): {2}" -f $name, $d.Count, $gnames)
    } catch {
        Write-Host ("  {0,-11} -> {1}" -f $name, [int]$_.Exception.Response.StatusCode.value__)
    }
}

Write-Host "`n=== 10. admin1 cannot sync a group it does not own ===" -ForegroundColor Cyan
$foreign = '[{"id":"group-2","name":"Hijacked","members":[]}]'
$code = StatusOf 'POST' '/api/groups/sync' $admin1.token $foreign
Write-Host ("  POST /api/groups/sync (foreign group) -> {0}  {1}" -f $code, $(if ($code -eq 403) { 'OK (403 blocked)' } else { "FAIL (got $code)" }))

$ownName = 'Watt Market Fabric & Textiles SaveCircle'
try {
    $g = (Invoke-WebRequest "$base/api/groups" -Headers @{ Authorization = "Bearer $($admin1.token)" } -UseBasicParsing).Content | ConvertFrom-Json
    $own = $g[0] | ConvertTo-Json -Depth 12 -Compress
    $payload = "[$own]"
    $code = StatusOf 'POST' '/api/groups/sync' $admin1.token $payload
    Write-Host ("  POST /api/groups/sync (own group)     -> {0}  {1}" -f $code, $(if ($code -eq 200) { 'OK (allowed)' } else { "unexpected" }))
} catch { Write-Host "  (skipped own-group sync: $($_.Exception.Message))" }

Write-Host "`nDone.`n" -ForegroundColor Green
