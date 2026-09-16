# SHAZAR — remove the phase 2 copies of the pages that moved into (site)
# Run this from the project root (the folder with package.json).

$old = @(
  "src\app\page.tsx",
  "src\app\not-found.tsx",
  "src\app\shop",
  "src\app\collections",
  "src\app\product",
  "src\app\story",
  "src\app\kurdish",
  "src\app\kurdistan",
  "src\app\contact"
)

foreach ($p in $old) {
  if (Test-Path $p) {
    Remove-Item -Recurse -Force $p
    Write-Host "removed  $p"
  }
}

Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "Done. What should be left in src\app:"
Get-ChildItem "src\app" | Select-Object -ExpandProperty Name
