param([string]$Root = (Split-Path -Parent $PSScriptRoot))
$missing = @()
Get-ChildItem $Root -Filter *.html | ForEach-Object {
  $htmlPath = $_.FullName
  $dir = Split-Path $htmlPath -Parent
  $raw = Get-Content -LiteralPath $htmlPath -Raw
  $matches = [regex]::Matches($raw, '(?:src|href)=["'']([^"'']+)["'']', 'IgnoreCase')
  foreach($m in $matches){
    $ref = $m.Groups[1].Value
    if($ref -match '^(https?:|data:|#|javascript:|mailto:|tel:|//)'){ continue }
    $refPath = ($ref -split '[?#]')[0]
    if([string]::IsNullOrWhiteSpace($refPath)){ continue }
    if($refPath -match '^\$\{'){ continue }
    $target = Join-Path $dir $refPath
    if(-not (Test-Path $target)){
      $missing += [pscustomobject]@{ File=$_.Name; Ref=$refPath }
    }
  }
}
if($missing.Count -eq 0){
  Write-Output 'OK: no faltan referencias locales en HTML raiz.'
}else{
  $missing | Sort-Object File,Ref | Format-Table -AutoSize
  exit 1
}
