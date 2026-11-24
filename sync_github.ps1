param (
    [string]$Message = "chore: update auditagent codebase"
)

Set-Location $PSScriptRoot
git add .
git commit -m "$Message"
git push origin main
Write-Host "Pushed changes to GitHub repository FahadKhan-20/AuditAgent"
