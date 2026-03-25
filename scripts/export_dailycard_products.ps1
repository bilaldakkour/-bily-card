param()

$ErrorActionPreference = 'Stop'

function Get-EnvMapFromFile {
  param([string]$Path)
  $map = @{}
  if (-not (Test-Path -LiteralPath $Path)) { return $map }
  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = [string]$_
    if ([string]::IsNullOrWhiteSpace($line)) { return }
    $trimmed = $line.Trim()
    if ($trimmed.StartsWith('#')) { return }
    $idx = $trimmed.IndexOf('=')
    if ($idx -lt 1) { return }
    $key = $trimmed.Substring(0, $idx).Trim()
    $val = $trimmed.Substring($idx + 1).Trim()
    if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
      $val = $val.Substring(1, $val.Length - 2)
    }
    if ($key) { $map[$key] = $val }
  }
  return $map
}

function Get-FirstValue {
  param($Obj, [string[]]$Keys)
  foreach ($k in $Keys) {
    if ($null -ne $Obj -and $Obj.PSObject.Properties.Name -contains $k) {
      $v = $Obj.$k
      if ($null -ne $v -and [string]::IsNullOrWhiteSpace([string]$v) -eq $false) { return $v }
    }
  }
  return $null
}

function Get-PriceValue {
  param($Obj)
  foreach ($k in @('price','cost','selling_price','final_price','amount','base_cost','unit_price')) {
    if ($null -ne $Obj -and $Obj.PSObject.Properties.Name -contains $k) {
      $n = 0
      if ([double]::TryParse([string]$Obj.$k, [ref]$n)) {
        return [double]::Parse([string]$n)
      }
    }
  }
  return $null
}

function Get-ItemsFromPayload {
  param($Payload)
  if ($Payload -is [System.Collections.IEnumerable] -and $Payload -isnot [string]) {
    if ($Payload -is [System.Array]) { return ,$Payload }
  }
  foreach ($k in @('results','data','products','items')) {
    if ($null -ne $Payload -and $Payload.PSObject.Properties.Name -contains $k) {
      $v = $Payload.$k
      if ($v -is [System.Array]) { return ,$v }
    }
  }
  return @()
}

function Get-PackageArray {
  param($Obj)
  foreach ($k in @('packages','variants','options','package_options','denominations','packageOptions')) {
    if ($null -ne $Obj -and $Obj.PSObject.Properties.Name -contains $k) {
      $v = $Obj.$k
      if ($v -is [System.Array] -and $v.Count -gt 0) { return ,$v }
    }
  }
  return @()
}

function Get-PackageOptionsFromInputFields {
  param($Obj)
  if ($null -eq $Obj -or -not ($Obj.PSObject.Properties.Name -contains 'inputFields')) { return @() }
  $fields = $Obj.inputFields
  if ($fields -isnot [System.Array]) { return @() }
  foreach ($field in $fields) {
    if ($null -eq $field) { continue }
    $name = [string](Get-FirstValue -Obj $field -Keys @('name'))
    $type = [string](Get-FirstValue -Obj $field -Keys @('type'))
    if ($name -eq 'package' -and $type -eq 'select' -and ($field.PSObject.Properties.Name -contains 'options')) {
      $options = $field.options
      if ($options -is [System.Array] -and $options.Count -gt 0) { return ,$options }
    }
  }
  return @()
}

function Parse-LabelAndPriceFromOptionText {
  param([string]$Text)
  $clean = [string]$Text
  $match = [regex]::Match($clean, '\$([0-9]+(?:\.[0-9]+)?)')
  $price = $null
  if ($match.Success) {
    $n = 0
    if ([double]::TryParse($match.Groups[1].Value, [ref]$n)) {
      $price = [double]$n
    }
  }
  $label = ($clean -replace '\s*-\s*\$[0-9]+(?:\.[0-9]+)?(\s*\(Out of stock\))?\s*$', '').Trim()
  if (-not $label) { $label = $clean.Trim() }
  $out = $clean -match 'out of stock'
  return [pscustomobject]@{
    label = $label
    price = $price
    inStock = (-not $out)
  }
}

function Extract-JsonArrayFromTsValue {
  param(
    [string]$Content,
    [string]$Marker
  )
  $markerIndex = $Content.IndexOf($Marker)
  if ($markerIndex -lt 0) { return $null }
  $searchFrom = $markerIndex + $Marker.Length
  $start = $Content.IndexOf('[', $searchFrom)
  if ($start -lt 0) { return $null }

  $depth = 0
  $inString = $false
  $stringQuote = ''
  $escaped = $false
  $end = -1

  for ($i = $start; $i -lt $Content.Length; $i++) {
    $ch = $Content[$i]
    if ($inString) {
      if ($escaped) {
        $escaped = $false
        continue
      }
      if ($ch -eq '\') {
        $escaped = $true
        continue
      }
      if ($ch -eq $stringQuote) {
        $inString = $false
        $stringQuote = ''
      }
      continue
    }

    if ($ch -eq '"' -or $ch -eq "'") {
      $inString = $true
      $stringQuote = $ch
      continue
    }
    if ($ch -eq '[') {
      $depth++
      continue
    }
    if ($ch -eq ']') {
      $depth--
      if ($depth -eq 0) {
        $end = $i
        break
      }
    }
  }

  if ($end -lt $start) { return $null }
  return $Content.Substring($start, $end - $start + 1)
}

function Escape-Xml {
  param([string]$Text)
  if ($null -eq $Text) { return '' }
  return [System.Security.SecurityElement]::Escape($Text)
}

function New-XlsxFile {
  param(
    [array]$Rows,
    [string]$OutputPath
  )

  Add-Type -AssemblyName System.IO.Compression.FileSystem

  $headers = @(
    'providerProductId',
    'productName',
    'slug',
    'category',
    'subcategory',
    'priceOrBaseCost',
    'stockStatusOrAvailability',
    'deliveryType',
    'packageOrVariantLabel',
    'rawProviderDataOrNotes'
  )

  $allRows = @()
  $allRows += ,$headers
  foreach ($r in $Rows) {
    $providerProductId = if ($null -ne $r.providerProductId) { [string]$r.providerProductId } else { '' }
    $productName = if ($null -ne $r.productName) { [string]$r.productName } else { '' }
    $slug = if ($null -ne $r.slug) { [string]$r.slug } else { '' }
    $category = if ($null -ne $r.category) { [string]$r.category } else { '' }
    $subcategory = if ($null -ne $r.subcategory) { [string]$r.subcategory } else { '' }
    $priceOrBaseCost = if ($null -ne $r.priceOrBaseCost) { [string]$r.priceOrBaseCost } else { '' }
    $stockStatusOrAvailability = if ($null -ne $r.stockStatusOrAvailability) { [string]$r.stockStatusOrAvailability } else { '' }
    $deliveryType = if ($null -ne $r.deliveryType) { [string]$r.deliveryType } else { '' }
    $packageOrVariantLabel = if ($null -ne $r.packageOrVariantLabel) { [string]$r.packageOrVariantLabel } else { '' }
    $rawProviderDataOrNotes = if ($null -ne $r.rawProviderDataOrNotes) { [string]$r.rawProviderDataOrNotes } else { '' }

    $allRows += ,@(
      $providerProductId,
      $productName,
      $slug,
      $category,
      $subcategory,
      $priceOrBaseCost,
      $stockStatusOrAvailability,
      $deliveryType,
      $packageOrVariantLabel,
      $rawProviderDataOrNotes
    )
  }

  $tmpRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("dailycard-xlsx-" + [Guid]::NewGuid().ToString('N'))
  $null = New-Item -ItemType Directory -Path $tmpRoot
  $null = New-Item -ItemType Directory -Path (Join-Path $tmpRoot '_rels')
  $null = New-Item -ItemType Directory -Path (Join-Path $tmpRoot 'xl')
  $null = New-Item -ItemType Directory -Path (Join-Path $tmpRoot 'xl\_rels')
  $null = New-Item -ItemType Directory -Path (Join-Path $tmpRoot 'xl\worksheets')

  $contentTypes = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>
'@
  Set-Content -LiteralPath (Join-Path $tmpRoot '[Content_Types].xml') -Value $contentTypes -Encoding UTF8

  $rels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>
'@
  Set-Content -LiteralPath (Join-Path $tmpRoot '_rels\.rels') -Value $rels -Encoding UTF8

  $workbook = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="DailyCard Products" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>
'@
  Set-Content -LiteralPath (Join-Path $tmpRoot 'xl\workbook.xml') -Value $workbook -Encoding UTF8

  $wbRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
'@
  Set-Content -LiteralPath (Join-Path $tmpRoot 'xl\_rels\workbook.xml.rels') -Value $wbRels -Encoding UTF8

  $styles = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>
'@
  Set-Content -LiteralPath (Join-Path $tmpRoot 'xl\styles.xml') -Value $styles -Encoding UTF8

  $sheetBuilder = New-Object System.Text.StringBuilder
  [void]$sheetBuilder.AppendLine('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')
  [void]$sheetBuilder.AppendLine('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">')
  [void]$sheetBuilder.AppendLine('  <sheetData>')

  for ($r = 0; $r -lt $allRows.Count; $r++) {
    $row = $allRows[$r]
    $rowIndex = $r + 1
    [void]$sheetBuilder.AppendLine("    <row r=""$rowIndex"">")
    for ($c = 0; $c -lt $row.Count; $c++) {
      $val = Escape-Xml([string]$row[$c])
      [void]$sheetBuilder.AppendLine('      <c t="inlineStr"><is><t>' + $val + '</t></is></c>')
    }
    [void]$sheetBuilder.AppendLine('    </row>')
  }

  [void]$sheetBuilder.AppendLine('  </sheetData>')
  [void]$sheetBuilder.AppendLine('</worksheet>')
  Set-Content -LiteralPath (Join-Path $tmpRoot 'xl\worksheets\sheet1.xml') -Value $sheetBuilder.ToString() -Encoding UTF8

  if (Test-Path -LiteralPath $OutputPath) {
    Remove-Item -LiteralPath $OutputPath -Force
  }
  [System.IO.Compression.ZipFile]::CreateFromDirectory($tmpRoot, $OutputPath)
  Remove-Item -LiteralPath $tmpRoot -Recurse -Force
}

$repo = (Get-Location).Path
$envMap = Get-EnvMapFromFile -Path (Join-Path $repo '.env.local')
$apiBase = if ($envMap.ContainsKey('DAILYCARD_API_BASE') -and $envMap['DAILYCARD_API_BASE']) { $envMap['DAILYCARD_API_BASE'] } else { 'https://dailycard.shop/UAPI/api-keys' }
$apiKey = if ($envMap.ContainsKey('DAILYCARD_API_KEY')) { $envMap['DAILYCARD_API_KEY'] } else { '' }
$apiSecret = if ($envMap.ContainsKey('DAILYCARD_API_SECRET')) { $envMap['DAILYCARD_API_SECRET'] } else { '' }
$sourceMode = 'dailycard_api'

$page = 1
$pageSize = 200
$allItems = @()

if ($apiKey -and $apiSecret) {
  $headers = @{
    'X-API-Key' = $apiKey
    'X-API-Secret' = $apiSecret
  }
  while ($true) {
    $url = ($apiBase.TrimEnd('/') + '/products/?page=' + $page + '&page_size=' + $pageSize)
    $response = Invoke-RestMethod -Method GET -Uri $url -Headers $headers
    $items = @(Get-ItemsFromPayload -Payload $response)
    if ($items.Count -eq 0) { break }
    $allItems += $items

    $hasNext = $false
    if ($null -ne $response -and $response.PSObject.Properties.Name -contains 'next' -and $response.next) { $hasNext = $true }
    if (-not $hasNext -and $null -ne $response -and ($response.PSObject.Properties.Name -contains 'count' -or $response.PSObject.Properties.Name -contains 'total' -or $response.PSObject.Properties.Name -contains 'total_count')) {
      $total = 0
      if ($response.PSObject.Properties.Name -contains 'count') { [void][double]::TryParse([string]$response.count, [ref]$total) }
      if ($total -le 0 -and $response.PSObject.Properties.Name -contains 'total') { [void][double]::TryParse([string]$response.total, [ref]$total) }
      if ($total -le 0 -and $response.PSObject.Properties.Name -contains 'total_count') { [void][double]::TryParse([string]$response.total_count, [ref]$total) }
      if ($total -gt ($page * $pageSize)) { $hasNext = $true }
    }
    if (-not $hasNext -and $items.Count -eq $pageSize) { $hasNext = $true }
    if (-not $hasNext) { break }
    $page += 1
  }
} else {
  $sourceMode = 'local_dailycard_catalog_snapshot'
  $extractScript = Join-Path $repo 'scripts\extract_bilycard_raw.js'
  if (-not (Test-Path -LiteralPath $extractScript)) {
    throw 'DailyCard API keys are missing and extract_bilycard_raw.js is not available.'
  }
  $null = & node $extractScript
  $jsonFile = Join-Path $repo 'exports\dailycard_raw_catalog.json'
  if (-not (Test-Path -LiteralPath $jsonFile)) {
    throw 'Failed to generate local dailycard_raw_catalog.json snapshot.'
  }
  $parsedItems = (Get-Content -LiteralPath $jsonFile -Raw) | ConvertFrom-Json
  $allItems = @()
  foreach ($it in $parsedItems) {
    $allItems += ,$it
  }
}

$rows = @()
$packageRowsGenerated = 0
$missingIdCount = 0
$missingPriceCount = 0

foreach ($item in $allItems) {
  $providerProductId = [string](Get-FirstValue -Obj $item -Keys @('id','product_id','provider_product_id','productId','sku'))
  $productName = [string](Get-FirstValue -Obj $item -Keys @('name','title','product_name','display_name'))
  $slug = [string](Get-FirstValue -Obj $item -Keys @('slug','internal_slug'))
  $category = [string](Get-FirstValue -Obj $item -Keys @('category_name','category','game','platform'))
  $subcategory = [string](Get-FirstValue -Obj $item -Keys @('subcategory','sub_category','subcategory_name','type'))
  $deliveryType = [string](Get-FirstValue -Obj $item -Keys @('delivery_type','deliveryTime','delivery_time'))

  $inStock = Get-FirstValue -Obj $item -Keys @('in_stock','available','is_available')
  $stockStatusRaw = [string](Get-FirstValue -Obj $item -Keys @('stock_status','stockStatus','status'))
  $availability = if (-not [string]::IsNullOrWhiteSpace($stockStatusRaw)) {
    $stockStatusRaw
  } elseif ($null -ne $inStock) {
    if ([string]$inStock -match '^(true|1|yes)$') { 'in_stock' } else { 'out_of_stock' }
  } else {
    'unknown'
  }

  $price = Get-PriceValue -Obj $item
  $packageArray = @(Get-PackageArray -Obj $item)
  $inputFieldOptions = @(Get-PackageOptionsFromInputFields -Obj $item)
  if ($packageArray.Count -eq 0 -and $inputFieldOptions.Count -gt 0) {
    $packageArray = $inputFieldOptions
  }
  if ($packageArray.Count -gt 0) {
    foreach ($pkg in $packageArray) {
      if ($pkg -is [string]) {
        $parsed = Parse-LabelAndPriceFromOptionText -Text ([string]$pkg)
        $optionStock = if ($parsed.inStock) { 'in_stock' } else { 'out_of_stock' }
        $rows += [pscustomobject]@{
          providerProductId = $providerProductId
          productName = $productName
          slug = $slug
          category = $category
          subcategory = $subcategory
          priceOrBaseCost = if ($null -ne $parsed.price) { $parsed.price } elseif ($null -ne $price) { $price } else { '' }
          stockStatusOrAvailability = $optionStock
          deliveryType = $deliveryType
          packageOrVariantLabel = [string]$parsed.label
          rawProviderDataOrNotes = 'package_option_without_distinct_provider_id'
        }
        $packageRowsGenerated += 1
      } else {
        $pkgId = [string](Get-FirstValue -Obj $pkg -Keys @('id','product_id','provider_product_id','productId','sku'))
        $pkgLabel = [string](Get-FirstValue -Obj $pkg -Keys @('label','name','title','value','option'))
        $pkgPrice = Get-PriceValue -Obj $pkg
        $pkgStock = [string](Get-FirstValue -Obj $pkg -Keys @('stock_status','stockStatus','status'))
        if ([string]::IsNullOrWhiteSpace($pkgStock)) { $pkgStock = $availability }
        $rowId = if (-not [string]::IsNullOrWhiteSpace($pkgId)) { $pkgId } else { $providerProductId }
        $note = if (-not [string]::IsNullOrWhiteSpace($pkgId)) { '' } else { 'nested_package_without_distinct_id' }

        $rows += [pscustomobject]@{
          providerProductId = $rowId
          productName = $productName
          slug = $slug
          category = $category
          subcategory = $subcategory
          priceOrBaseCost = if ($null -ne $pkgPrice) { $pkgPrice } elseif ($null -ne $price) { $price } else { '' }
          stockStatusOrAvailability = $pkgStock
          deliveryType = $deliveryType
          packageOrVariantLabel = $pkgLabel
          rawProviderDataOrNotes = $note
        }
        $packageRowsGenerated += 1
      }
    }
  } else {
    $rows += [pscustomobject]@{
      providerProductId = $providerProductId
      productName = $productName
      slug = $slug
      category = $category
      subcategory = $subcategory
      priceOrBaseCost = if ($null -ne $price) { $price } else { '' }
      stockStatusOrAvailability = $availability
      deliveryType = $deliveryType
      packageOrVariantLabel = ''
      rawProviderDataOrNotes = ''
    }
  }
}

foreach ($r in $rows) {
  if ([string]::IsNullOrWhiteSpace([string]$r.providerProductId)) { $missingIdCount += 1 }
  if ([string]::IsNullOrWhiteSpace([string]$r.priceOrBaseCost)) { $missingPriceCount += 1 }
}

$uniqueCategories = @($rows | ForEach-Object { [string]$_.category } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Sort-Object -Unique)

$outDir = Join-Path $repo 'exports'
if (-not (Test-Path -LiteralPath $outDir)) { $null = New-Item -ItemType Directory -Path $outDir }
$outPath = Join-Path $outDir 'dailycard_products_export.xlsx'

New-XlsxFile -Rows $rows -OutputPath $outPath

$summary = [pscustomobject]@{
  sourceMode = $sourceMode
  filePath = $outPath
  extractedRows = $rows.Count
  rawDailyCardItems = $allItems.Count
  categoriesCount = $uniqueCategories.Count
  packagesAsSeparateRows = ($packageRowsGenerated -gt 0)
  packageRowsGenerated = $packageRowsGenerated
  rowsWithoutId = $missingIdCount
  rowsWithoutPrice = $missingPriceCount
}

$summary | ConvertTo-Json -Depth 4
