# Cek apakah cookie session Supabase (sb-*) bisa diambil dari Chrome lokal.
$ErrorActionPreference = "SilentlyContinue"
$ud = "$env:LOCALAPPDATA\Google\Chrome\User Data"
$state = "$ud\Local State"
$candidates = @(
  "$ud\Default\Network\Cookies",
  "$ud\Default\Cookies",
  "$ud\Profile 1\Network\Cookies"
)
$found = $null
foreach ($c in $candidates) { if (Test-Path $c) { $found = $c; break } }
Write-Output "Local State exists: $(Test-Path $state)"
Write-Output "Cookies DB: $found"
if ($found) {
  # Copy DB supaya bisa dibaca walau Chrome aktif (SQLite lock).
  $tmp = "$env:TEMP\chrome_cookies_copy.sqlite"
  Copy-Item $found $tmp -Force
  Write-Output "copied to $tmp ($([math]::Round((Get-Item $tmp).Length/1KB)) KB)"
}
