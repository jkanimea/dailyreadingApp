import csv, os

sql = '-- Auto-generated seed data import\n\n'

for i in range(1, 5):
    csv_path = f'database/seed-data/series-{i}-readings.csv'
    if not os.path.exists(csv_path):
        continue

    series_id = i
    sql += f'\nIF NOT EXISTS (SELECT 1 FROM Series WHERE Id = {series_id})\n'
    sql += f"    INSERT INTO Series (Id, Name, CreatedAt) VALUES ({series_id}, 'Series {i}', GETUTCDATE());\n\n"

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            bible = row.get('BibleReading', '').replace("'", "''")
            primary_range = row.get('PrimaryBookPageRange', '').replace("'", "''")
            primary_start = int(row.get('PrimaryBookPageStart', 0) or 0)
            primary_end = int(row.get('PrimaryBookPageEnd', 0) or 0)
            secondary_range = row.get('SecondaryBookPageRange', '').replace("'", "''") if row.get('SecondaryBookPageRange') else ''
            secondary_start = row.get('SecondaryBookPageStart', '') or ''
            secondary_end = row.get('SecondaryBookPageEnd', '') or ''
            sort_order = int(row.get('SortOrder', 0) or 0)
            month_val = int(row.get('Month', 0) or 0)
            day_val = int(row.get('Day', 0) or 0)

            sec_range_val = f"'{secondary_range}'" if secondary_range else 'NULL'
            sec_start_val = secondary_start if secondary_start else 'NULL'
            sec_end_val = secondary_end if secondary_end else 'NULL'

            sql += f'IF NOT EXISTS (SELECT 1 FROM DailyReadings WHERE SeriesId = {series_id} AND Month = {month_val} AND Day = {day_val})\n'
            sql += f'    INSERT INTO DailyReadings (SeriesId, Month, Day, BibleReading, PrimaryBookPageRange, PrimaryBookPageStart, PrimaryBookPageEnd, SecondaryBookPageRange, SecondaryBookPageStart, SecondaryBookPageEnd, SortOrder, CreatedAt)\n'
            sql += f"    VALUES ({series_id}, {month_val}, {day_val}, N'{bible}', N'{primary_range}', {primary_start}, {primary_end}, {sec_range_val}, {sec_start_val}, {sec_end_val}, {sort_order}, GETUTCDATE());\n"

output_path = 'seed-import.sql'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(sql)

print(f'Generated: {os.path.getsize(output_path)} bytes -> {output_path}')
