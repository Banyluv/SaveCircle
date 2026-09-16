# Verifies that group admins only see the loan borrowers THEY registered.
# Creates two borrowers (one per admin) and checks cross-visibility.
$ErrorActionPreference = 'Continue'
$base = 'http://127.0.0.1:5099'

function Login($email, $password) {
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    try {
        return (Invoke-WebRequest "$base/api/auth/login" -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing).Content | ConvertFrom-Json
    } catch { return $null }
}
function Post($path, $token, $obj) {
    try {
        $r = Invoke-WebRequest "$base$path" -Method POST -Headers @{ Authorization = "Bearer $token" } -Body ($obj | ConvertTo-Json) -ContentType 'application/json' -UseBasicParsing
        return @{ code = $r.StatusCode; body = ($r.Content | ConvertFrom-Json) }
    } catch {
        $code = [int]$_.Exception.Response.StatusCode.value__
        return @{ code = $code; body = $null }
    }
}
function Get($path, $token) {
    try {
        $r = Invoke-WebRequest "$base$path" -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing
        return ($r.Content | ConvertFrom-Json)
    } catch { return $null }
}

$super = Login 'superadmin@savecircle.com' 'superadmin123'
$admin1 = Login 'admin1@savecircle.com' 'admin123'
$admin2 = Login 'admin2@savecircle.com' 'admin123'

$stamp = Get-Date -Format 'HHmmss'
$b1Email = "alpha$stamp@example.com"
$b2Email = "beta$stamp@example.com"

Write-Host "`n=== Creating one borrower per group admin ===" -ForegroundColor Cyan
# admin1 registers borrower A (individual)
$r1 = Post '/api/auth/register' $admin1.token @{
    name = "Alpha Borrower $stamp"; email = $b1Email; password = 'borrow123'
    role = 'individual'; phone = '08011111111'; address = 'Calabar'
    bankName = 'Zenith Bank'; accountNumber = '1111222233'; accountName = "Alpha Borrower $stamp"
}
Write-Host ("  admin1 registers '$b1Email' -> {0}" -f $r1.code)

# admin2 registers borrower B (cooperative)
$r2 = Post '/api/auth/register' $admin2.token @{
    name = "Beta Coop $stamp"; email = $b2Email; password = 'borrow123'
    role = 'cooperative'; orgName = "Beta Coop $stamp"; phone = '08022222222'; address = 'Lagos'
    bankName = 'GTBank'; accountNumber = '4444555566'; accountName = "Beta Coop $stamp"
}
Write-Host ("  admin2 registers '$b2Email' -> {0}" -f $r2.code)

Write-Host "`n=== Borrower visibility per admin ===" -ForegroundColor Cyan
$expected = @{}
foreach ($pair in @(@('superadmin', $super), @('admin1', $admin1), @('admin2', $admin2))) {
    $name = $pair[0]; $u = $pair[1]
    $borrowers = Get '/api/loans/borrowers' $u.token
    $emails = @($borrowers.data | ForEach-Object { $_.email })
    $hasB1 = $emails -contains $b1Email
    $hasB2 = $emails -contains $b2Email
    Write-Host ("  {0,-11} count={1}  hasAlpha={2}  hasBeta={3}" -f $name, $borrowers.data.Count, $hasB1, $hasB2)
    $expected[$name] = @{ b1 = $hasB1; b2 = $hasB2 }
}

Write-Host "`n=== Assertions ===" -ForegroundColor Cyan
$fail = 0
if (-not $expected['admin1'].b1) { Write-Host "  FAIL: admin1 should see their own borrower"; $fail++ } else { Write-Host "  OK: admin1 sees own borrower (Alpha)" }
if ($expected['admin1'].b2) { Write-Host "  FAIL: admin1 must NOT see admin2's borrower"; $fail++ } else { Write-Host "  OK: admin1 cannot see admin2's borrower (Beta)" }
if (-not $expected['admin2'].b2) { Write-Host "  FAIL: admin2 should see their own borrower"; $fail++ } else { Write-Host "  OK: admin2 sees own borrower (Beta)" }
if ($expected['admin2'].b1) { Write-Host "  FAIL: admin2 must NOT see admin1's borrower"; $fail++ } else { Write-Host "  OK: admin2 cannot see admin1's borrower (Alpha)" }
if (-not ($expected['superadmin'].b1 -and $expected['superadmin'].b2)) { Write-Host "  FAIL: superadmin should see both"; $fail++ } else { Write-Host "  OK: superadmin sees both borrowers" }

Write-Host "`n=== admin2 cannot review admin1's borrower loan (cross-group guard) ===" -ForegroundColor Cyan
# alpha applies for a loan
$apply = Post '/api/loans/apply' $admin1.token @{ borrower_id = $r1.body.id; principal_amount = 50000; tenure_months = 3; repayment_frequency = 'monthly'; purpose = 'test'; interest_type = 'flat'; annual_rate = 12 }
if ($apply.code -eq 200 -or $apply.code -eq 201) {
    $loanId = $apply.body.data.loan_id
    if (-not $loanId) { $loanId = $apply.body.data.application.id }
    Write-Host ("  applied loan id={0}" -f $loanId)
    if ($loanId) {
        $foreign = Post "/api/loans/admin/$loanId/review" $admin2.token @{ action = 'approve' }
        Write-Host ("  admin2 reviews admin1's loan -> {0}  {1}" -f $foreign.code, $(if ($foreign.code -eq 403) { 'OK (403 blocked)' } else { 'FAIL - should be 403' }))
        if ($foreign.code -eq 403) { } else { $fail++ }
    }
} else {
    Write-Host ("  (could not create test loan: {0})" -f $apply.code)
}

Write-Host ""
if ($fail -eq 0) { Write-Host "ALL SCOPING CHECKS PASSED" -ForegroundColor Green }
else { Write-Host "$fail CHECK(S) FAILED" -ForegroundColor Red }
Write-Host ""
