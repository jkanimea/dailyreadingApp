# Encounter Daily - Setup Guide

## Prerequisites

- .NET 8.0 SDK or later
- Node.js 20.x LTS or later
- SQL Server Express (or Podman for containerized development)
- Angular CLI (`npm install -g @angular/cli`)
- Ionic CLI (`npm install -g @ionic/cli`)

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Restore NuGet packages:
   ```bash
   dotnet restore
   ```

3. Update the connection string in `EncounterDaily.API/appsettings.Development.json`

4. Run database migrations (when created):
   ```bash
   dotnet ef database update
   ```

5. Start the API:
   ```bash
   cd EncounterDaily.API
   dotnet run
   ```

   The API will be available at `https://localhost:5001` with Swagger at `/swagger`.

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `src/environments/environment.local.ts` with your local API URL:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'https://localhost:5001/api/v1'
   };
   ```

4. Start the development server:
   ```bash
   ionic serve
   ```

## Podman Development (Optional)

Run the entire stack with Podman:

```bash
podman-compose up -d
```

This starts SQL Server and the API in containers.
