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

```bash
# iOS Simulator
npm run e2e:ios

# Android Emulator
npm run e2e:android

# Web preview
npm run e2e:web
```

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
