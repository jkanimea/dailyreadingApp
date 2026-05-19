# Encounter Daily - Testing Guide

## Running Tests

### Backend Tests

```bash
# Run all unit tests
dotnet test backend/EncounterDaily.Tests/ --filter "Category=Unit"

# Run all integration tests
dotnet test backend/EncounterDaily.Tests/ --filter "Category=Integration"

# Run with coverage report
dotnet test backend/EncounterDaily.Tests/ /p:CollectCoverage=true /p:CoverletOutputFormat=lcov

# Run specific test class
dotnet test backend/EncounterDaily.Tests/ --filter "FullyQualifiedName~ReadingServiceTests"
```

### Frontend Tests

```bash
# Run unit tests
cd frontend && ng test

# Run with coverage
cd frontend && ng test --code-coverage

# Run headless (CI)
cd frontend && ng test --watch=false --browsers=ChromeHeadless
```

### E2E Tests

The API requires JWT authentication (Google/Facebook). For data pipeline testing (Bible + EGW lookups), use the import tool's direct DB access to bypass auth:

**Test Bible lookup for a specific reading:**

```bash
# Set connection string
$env:ConnectionStrings__DefaultConnection = "Server=(localdb)\mssqllocaldb;Database=EncounterDaily;Trusted_Connection=True;"

# Run dotnet script (from backend/tools/EncounterDaily.ImportTool)
cd backend/tools/EncounterDaily.ImportTool

# Test a specific Bible reference
dotnet run -- lookup-verse "John 3:16"

# Test EGW page assembly (uses EgwPage table)
dotnet run -- lookup-egw DA 19-25
```

If e2e scripts (`npm run e2e:web`) are configured they will hit the API directly through the frontend.

### Regression Tests

```bash
# Smoke tests
npm run test:smoke

# Critical path
npm run test:critical

# Full regression
npm run test:full

# Performance tests
npm run test:performance
```

## Coverage Requirements

| Component | Minimum |
|-----------|---------|
| Backend overall | 80% |
| Frontend overall | 80% |
| Services (both) | 85% |
| Pipes | 100% |
| Guards | 90% |

## Data Pipeline Testing

### Verify EGW text is assembled from EgwPage table (not from FullTextPrimary)

1. Open SQL Server Object Explorer or run:
   ```sql
   SELECT r.Id, r.PrimaryBookPageRange, r.PrimaryBookPageStart, r.PrimaryBookPageEnd,
          b.Title AS Book, b.BookType
   FROM DailyReadings r
   JOIN Series s ON r.SeriesId = s.Id
   JOIN Books b ON s.PrimaryBookId = b.Id
   WHERE r.Id = 1
   ```

2. Then verify the EgwPages exist:
   ```sql
   SELECT PageNumber, LEFT([Text], 100) AS Preview
   FROM EgwPages
   WHERE BookId = (SELECT PrimaryBookId FROM Series WHERE Id = 1)
     AND PageNumber BETWEEN 19 AND 25
   ORDER BY PageNumber
   ```

3. Run the API and call the full reading endpoint with a valid JWT token:
   ```bash
   curl -H "Authorization: Bearer <token>" http://localhost:5000/api/v1/Reading/1/full
   ```

4. Verify the response contains `fullTextBible` (from BibleVerse table) and `fullTextPrimary` (assembled from EgwPage table, not stored per-reading).
