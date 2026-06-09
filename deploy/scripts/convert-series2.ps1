$repoRoot = Resolve-Path "$PSScriptRoot\..\.."
$rawCsv = Join-Path $repoRoot "database\encounter\series2.csv"
$outputCsv = Join-Path $repoRoot "database\seed-data\series-2-readings.csv"

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
    $sopCell = if ($row.'Spirit of Prophecy Reading') { $row.'Spirit of Prophecy Reading'.Trim() } else { '' }

    if (-not $grouped.ContainsKey($key)) {
        $grouped[$key] = @{ Month = $month; Day = $day; BibleReadings = @(); PrimarySOP = ''; SecondarySOP = '' }
    }

    if (![string]::IsNullOrWhiteSpace($bibleCell)) {
        $grouped[$key].BibleReadings += $bibleCell
    }

    # Parse "AA 1-5" or "GC 1-5" format
    if (![string]::IsNullOrWhiteSpace($sopCell)) {
        if ($sopCell -match '^AA\s+(\d+)\s*-\s*(\d+)') {
            if ([string]::IsNullOrWhiteSpace($grouped[$key].PrimarySOP)) {
                $grouped[$key].PrimarySOP = $sopCell
            }
        } elseif ($sopCell -match '^GC\s+(\d+)\s*-\s*(\d+)') {
            if ([string]::IsNullOrWhiteSpace($grouped[$key].SecondarySOP)) {
                $grouped[$key].SecondarySOP = $sopCell
            }
        }
    }
}

$output = @()
$sortOrder = 101

foreach ($key in ($grouped.Keys | Sort-Object)) {
    $g = $grouped[$key]

    $bibleReading = if ($g.BibleReadings.Count -gt 0) { ($g.BibleReadings -join '; ') } else { '' }

    # Parse primary (AA)
    $primaryRange = ''; $primaryStart = $null; $primaryEnd = $null
    if (![string]::IsNullOrWhiteSpace($g.PrimarySOP)) {
        if ($g.PrimarySOP -match 'AA\s+(\d+)\s*-\s*(\d+)') {
            $primaryStart = [int]$matches[1]; $primaryEnd = [int]$matches[2]
            $primaryRange = "Acts of the Apostles pp. $primaryStart-$primaryEnd"
        }
    }

    # Parse secondary (GC)
    $secondaryRange = ''; $secondaryStart = $null; $secondaryEnd = $null
    if (![string]::IsNullOrWhiteSpace($g.SecondarySOP)) {
        if ($g.SecondarySOP -match 'GC\s+(\d+)\s*-\s*(\d+)') {
            $secondaryStart = [int]$matches[1]; $secondaryEnd = [int]$matches[2]
            $secondaryRange = "The Great Controversy pp. $secondaryStart-$secondaryEnd"
        }
    }

    $output += [PSCustomObject]@{
        SeriesId = 2; Month = $g.Month; Day = $g.Day
        BibleReading = $bibleReading
        PrimaryBookPageRange = $primaryRange
        PrimaryBookPageStart = if ($primaryStart) { $primaryStart } else { 0 }
        PrimaryBookPageEnd = if ($primaryEnd) { $primaryEnd } else { 0 }
        SecondaryBookPageRange = $secondaryRange
        SecondaryBookPageStart = if ($secondaryStart) { $secondaryStart } else { $null }
        SecondaryBookPageEnd = if ($secondaryEnd) { $secondaryEnd } else { $null }
        SortOrder = $sortOrder
        FullTextPrimary = ''; FullTextSecondary = ''; SummaryPoints = ''
    }
    $sortOrder++
}

$output | Export-Csv $outputCsv -NoTypeInformation
Write-Host "Converted $($output.Count) readings to series-2-readings.csv"
