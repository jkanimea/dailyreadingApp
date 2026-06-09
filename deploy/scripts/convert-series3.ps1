$repoRoot = Resolve-Path "$PSScriptRoot\..\.."
$rawCsv = Join-Path $repoRoot "database\encounter\series3.csv"
$outputCsv = Join-Path $repoRoot "database\seed-data\series-3-readings.csv"

$csv = Import-Csv $rawCsv

$monthMap = @{
    'January'=1; 'February'=2; 'March'=3; 'April'=4
    'May'=5; 'June'=6; 'July'=7; 'August'=8
    'September'=9; 'October'=10; 'November'=11; 'December'=12
}

$grouped = @{}

foreach ($row in $csv) {
    $month = $monthMap[$row.Month]
    $day = [int]($row.Day -replace '\s*\(duplicate\)', '')
    $key = "$month-$day"

    $bibleCell = if ($row.'Bible Reading') { $row.'Bible Reading'.Trim() } else { '' }
    $ppCell = if ($row.'Patriarchs and Prophets (PP)') { $row.'Patriarchs and Prophets (PP)'.Trim() } else { '' }

    if (-not $grouped.ContainsKey($key)) {
        $grouped[$key] = @{ Month = $month; Day = $day; BibleReadings = @(); PP = '' }
    }

    if (![string]::IsNullOrWhiteSpace($bibleCell)) {
        $grouped[$key].BibleReadings += $bibleCell
    }

    if (![string]::IsNullOrWhiteSpace($ppCell) -and $ppCell -match '^PP\s+' -and [string]::IsNullOrWhiteSpace($grouped[$key].PP)) {
        $grouped[$key].PP = $ppCell
    }
}

$output = @()
$sortOrder = 101

foreach ($key in ($grouped.Keys | Sort-Object)) {
    $g = $grouped[$key]
    $bibleReading = if ($g.BibleReadings.Count -gt 0) { ($g.BibleReadings -join '; ') } else { '' }

    $primaryRange = ''; $primaryStart = $null; $primaryEnd = $null
    if (![string]::IsNullOrWhiteSpace($g.PP) -and $g.PP -match '^PP\s+') {
        if ($g.PP -match 'PP\s+(\d+)\s*-\s*(\d+)') {
            $primaryStart = [int]$matches[1]; $primaryEnd = [int]$matches[2]
            $primaryRange = "Patriarchs and Prophets pp. $primaryStart-$primaryEnd"
        } elseif ($g.PP -match 'PP\s+(\d+)') {
            $primaryStart = [int]$matches[1]; $primaryEnd = [int]$matches[1]
            $primaryRange = "Patriarchs and Prophets p. $primaryStart"
        }
    }

    $output += [PSCustomObject]@{
        SeriesId = 3; Month = $g.Month; Day = $g.Day
        BibleReading = $bibleReading
        PrimaryBookPageRange = $primaryRange
        PrimaryBookPageStart = if ($primaryStart) { $primaryStart } else { 0 }
        PrimaryBookPageEnd = if ($primaryEnd) { $primaryEnd } else { 0 }
        SecondaryBookPageRange = ''; SecondaryBookPageStart = $null; SecondaryBookPageEnd = $null
        SortOrder = $sortOrder
        FullTextPrimary = ''; FullTextSecondary = ''; SummaryPoints = ''
    }
    $sortOrder++
}

$output | Export-Csv $outputCsv -NoTypeInformation
Write-Host "Converted $($output.Count) readings to series-3-readings.csv"
