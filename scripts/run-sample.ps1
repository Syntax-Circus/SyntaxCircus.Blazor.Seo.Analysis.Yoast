param([string]$Url = "http://127.0.0.1:5090", [string]$Key = "local-qualification-only")
$ErrorActionPreference = "Stop"
$env:SAMPLE_ACCESS_KEY = $Key
$env:ASPNETCORE_URLS = $Url
$env:ASPNETCORE_ENVIRONMENT = "Development"
& rtk proxy dotnet run --project samples/BlazorHost --configuration Release --no-build --no-restore
