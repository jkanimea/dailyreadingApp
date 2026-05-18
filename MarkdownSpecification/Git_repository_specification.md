```
# Git Repository Specification

## Project: Encounter Daily Mobile Application

### Repository URL: `https://github.com/jkanimea/dailyreadingApp.git`

---

## 1. REPOSITORY INFORMATION

| Item | Value |
|------|-------|
| **Repository URL** | `https://github.com/jkanimea/dailyreadingApp.git` |
| **Status** | New / Empty |
| **Project Name** | `dailyreadingApp` |
| **Default Branch** | `main` (confirm on GitHub) |

---

## 2. INITIAL REPOSITORY SETUP

### 2.1 Clone the Empty Repository

```bash
git clone https://github.com/jkanimea/dailyreadingApp.git
cd dailyreadingApp
```

### 2.2 Create Initial Project Structure

Since the repository is empty, create the following folder structure:

**text**

```
dailyreadingApp/
├── backend/                    # .NET Core Web API
│   ├── EncounterDaily.API/
│   ├── EncounterDaily.Core/
│   ├── EncounterDaily.Infrastructure/
│   ├── EncounterDaily.Services/
│   └── EncounterDaily.Tests/
├── frontend/                   # Angular/Ionic mobile app
│   ├── src/
│   ├── e2e/
│   ├── regression/
│   └── ...
├── database/                   # SQL Express scripts
│   ├── migrations/
│   └── seed-data/
├── .github/
│   └── workflows/              # CI/CD pipelines
│       ├── test.yml
│       └── deploy.yml
├── docs/                       # Documentation
│   ├── api-spec.md
│   ├── setup-guide.md
│   └── testing-guide.md
├── .gitignore
├── README.md
└── podman-compose.yml          # Optional: for local development
```

### 2.3 .gitignore File

Create a `.gitignore` file with the following entries:

**gitignore**

```
# .NET
bin/
obj/
*.user
*.suo
*.db
*.log

# Angular / Node
node_modules/
dist/
.tmp/
.angular/
coverage/
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo

# Environment
.env
.env.local
appsettings.Development.json

# OS
.DS_Store
Thumbs.db

# Capacitor
ios/
android/
```

---

## 3. BRANCH STRATEGY

### 3.1 Recommended Branch Structure

| Branch        | Purpose               | Protection Rules                                           |
| ------------- | --------------------- | ---------------------------------------------------------- |
| `main`      | Production-ready code | Require PR, require status checks, require reviews         |
| `develop`   | Integration branch    | Require PR, require status checks                          |
| `feature/*` | New features          | Branch from `develop`, merge back to `develop`         |
| `bugfix/*`  | Bug fixes             | Branch from `develop` or `main`                        |
| `release/*` | Release preparation   | Branch from `develop`, merge to `main` and `develop` |
| `hotfix/*`  | Emergency fixes       | Branch from `main`, merge to `main` and `develop`    |

### 3.2 Initial Branch Creation

**bash**

```
# After creating initial project structure on main
git add .
git commit -m "chore: initial project structure"
git push origin main

# Create develop branch
git checkout -b develop
git push origin develop
```

### 3.3 Branch Naming Convention

| Type    | Format                              | Example                        |
| ------- | ----------------------------------- | ------------------------------ |
| Feature | `feature/short-description`       | `feature/series-1-readings`  |
| Bugfix  | `bugfix/issue-number-description` | `bugfix/42-login-failure`    |
| Release | `release/version-number`          | `release/v1.0.0`             |
| Hotfix  | `hotfix/description`              | `hotfix/critical-auth-error` |

### 3.4 Commit Message Convention

**text**

```
<type>(<scope>): <subject>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation only
- style: Code style (formatting, semicolons, etc.)
- refactor: Code change that neither fixes bug nor adds feature
- test: Adding or fixing tests
- chore: Maintenance tasks

Example:
feat(api): add GET endpoint for today's reading
fix(frontend): correct bookmark icon state after sync
test(backend): increase coverage for ProgressService
```

---

## 4. GITHUB REPOSITORY SETTINGS

### 4.1 Required Settings to Configure

| Setting                                | Recommended Value                      |
| -------------------------------------- | -------------------------------------- |
| **Default branch**               | `develop` (or `main` if preferred) |
| **Merge strategy**               | Squash and merge (preferred)           |
| **Require pull request reviews** | 1 reviewer minimum                     |
| **Require status checks**        | All tests must pass (CI pipeline)      |
| **Include administrators**       | Yes                                    |
| **Issue templates**              | Enable bug report and feature request  |

### 4.2 Protect `main` Branch

* Require pull request reviews (1)
* Dismiss stale reviews
* Require status checks (CI tests)
* Require branches to be up to date
* No direct pushes to `main`

### 4.3 Protect `develop` Branch (Optional but Recommended)

* Require status checks (CI tests)
* No direct pushes (recommended for teams of 2+)

---

## 5. GITHUB ACTIONS SECRETS

Navigate to: **Settings → Secrets and variables → Actions**

| Secret Name                | Description              | Example Value                                                  |
| -------------------------- | ------------------------ | -------------------------------------------------------------- |
| `CONNECTION_STRING_TEST` | Test database connection | `Server=(localdb)\MSSQLLocalDB;Database=EncounterDailyTest;` |
| `GOOGLE_CLIENT_ID`       | Google OAuth client ID   | From Google Cloud Console                                      |
| `GOOGLE_CLIENT_SECRET`   | Google OAuth secret      | From Google Cloud Console                                      |
| `FACEBOOK_APP_ID`        | Facebook OAuth app ID    | From Facebook Developers                                       |
| `FACEBOOK_APP_SECRET`    | Facebook OAuth secret    | From Facebook Developers                                       |

---

## 6. CI/CD PIPELINE

### 6.1 GitHub Actions Workflow File

Create `.github/workflows/ci.yml`:

**yaml**

```
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: 8.0.x
      - name: Restore dependencies
        run: dotnet restore backend/
      - name: Run unit tests
        run: dotnet test backend/ --filter "Category=Unit" --no-restore --verbosity normal
      - name: Run integration tests
        run: dotnet test backend/ --filter "Category=Integration" --no-restore --verbosity normal

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20.x
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Run unit tests
        run: cd frontend && ng test --watch=false --browsers=ChromeHeadless
      - name: Run linting
        run: cd frontend && ng lint

  e2e-tests:
    runs-on: macos-latest
    needs: [backend-tests, frontend-tests]
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20.x
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Run E2E tests (iOS)
        run: cd frontend && npm run e2e:ios -- --headless
```

### 6.2 Status Checks Required

Before merging any PR, the following status checks must pass:

* `backend-tests`
* `frontend-tests`
* `backend-security-scan`
* `e2e-tests`
* `performance-tests`
* `frontend-a11y-tests`

### 6.3 Deploy Pipeline (`deploy.yml`)

Create `.github/workflows/deploy.yml`:

**yaml**

```
name: Deploy Pipeline

on:
  push:
    branches: [develop, main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: 8.0.x
      - name: Build .NET API
        run: dotnet publish backend/ -c Release -o publish/api
      - uses: actions/setup-node@v4
        with:
          node-version: 20.x
      - name: Build Angular app
        run: |
          cd frontend
          npm ci
          ng build --configuration production
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: publish/

  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    needs: [build]
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.encounterdaily.com
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
      - name: Deploy to Azure App Service (Staging)
        uses: azure/webapps-deploy@v3
        with:
          app-name: encounter-daily-staging
          slot-name: staging
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE_STAGING }}

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: [build]
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://encounterdaily.com
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
      - name: Deploy to Azure App Service (Production)
        uses: azure/webapps-deploy@v3
        with:
          app-name: encounter-daily-prod
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION }}
```

### 6.4 Required GitHub Secrets for Deploy

| Secret Name | Description |
|-------------|-------------|
| `AZURE_WEBAPP_PUBLISH_PROFILE_STAGING` | Azure publish profile for staging slot |
| `AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION` | Azure publish profile for production slot |

### 6.5 Podman Configuration (Containers)

| Item | Specification |
|------|---------------|
| Container Engine | **Podman** (daemonless, compatible with docker commands) |
| `podman-compose.yml` | Defines `sqlserver` (mcr.microsoft.com/mssql/server:2022-latest) and `api` services |
| `Containerfile` / `Dockerfile` | Multi-stage build for .NET API: Stage 1 (SDK) restores and builds; Stage 2 (ASP.NET Alpine runtime) for minimal footprint |

---

## 7. VERSION NUMBERING STRATEGY

| Component | Scheme | Example |
|-----------|--------|---------|
| App version | Semantic: `vMAJOR.MINOR.PATCH` | `v1.3.2` |
| MAJOR bump | Breaking API changes or significant UI redesign | `v2.0.0` |
| MINOR bump | New features (new series, new screen), backward compatible | `v1.3.0` |
| PATCH bump | Bug fixes, performance improvements, no API contract change | `v1.3.1` |
| Build metadata | Append build number: `v1.3.2+42` | CI injects build number |
| Git tag | Tag every release commit: `git tag v1.3.2` | Push tags to trigger deploy |
| Changelog | Require `CHANGELOG.md` updates for every release branch | Documents user-facing changes |

## 8. CODEOWNERS

Create `.github/CODEOWNERS`:

**text**

```
# Default owner for all files
* @jkanimea

# Backend code
/backend/ @jkanimea

# Frontend code
/frontend/ @jkanimea

# CI/CD workflows
/.github/ @jkanimea

# Database scripts
/database/ @jkanimea
```

CODEOWNERS ensures the correct reviewers are auto-assigned when a PR touches specific code areas.

---

## 9. README.md TEMPLATE

Create a `README.md` file at the root of the repository:

**markdown**

```
# Encounter Daily

A cross-platform mobile application for daily devotional readings based on "Christ The Way" and three additional series.

## Tech Stack

- **Frontend**: Angular + Ionic + Capacitor
- **Backend**: .NET Core Web API
- **Database**: SQL Express
- **Authentication**: Google & Facebook OAuth

## Project Structure
```

dailyreadingApp/
├── backend/ # .NET Core API
├── frontend/ # Angular/Ionic mobile app
├── database/ # SQL scripts
├── .github/ # CI/CD workflows
└── docs/ # Documentation

**text**

```

## Setup Instructions

See [docs/setup-guide.md](docs/setup-guide.md)

## Testing

See [docs/testing-guide.md](docs/testing-guide.md)

## API Documentation

Swagger available at `/swagger` when running the API locally.

## License

[Specify license]
```

---

## 10. DEVELOPMENT WORKFLOW

### 10.1 Starting a New Feature

**bash**

```
# Ensure you're on develop with latest changes
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/series-1-backend

# Work on the feature...

# Commit changes
git add .
git commit -m "feat(backend): add Series 1 readings repository and service"

# Push to remote
git push origin feature/series-1-backend

# Create Pull Request on GitHub from feature/series-1-backend to develop
```

### 10.2 Pull Request Checklist

Before submitting a PR, ensure:

* Code follows SOLID principles
* Unit tests written and passing
* Integration tests passing
* Code coverage ≥ 80% (backend) / ≥ 75% (frontend)
* No linting errors
* Accessibility tests pass with zero critical violations
* Security scan passes with no high-severity findings
* Documentation updated (if applicable)
* PR description clearly explains changes

### 10.3 Code Review Process

1. Developer creates PR and assigns reviewer(s)
2. Reviewer checks code quality, test coverage, and functionality
3. CI pipeline must pass all checks
4. Once approved, PR is squashed and merged into `develop`
5. Delete feature branch after merge

---

## 11. COLLABORATION GUIDELINES

### 11.1 Roles and Responsibilities

| Role                                      | Responsibilities                             |
| ----------------------------------------- | -------------------------------------------- |
| **Repository Owner** (`jkanimea`) | Merge PRs, manage settings, approve releases |
| **Backend Developer**               | API, services, database, backend tests       |
| **Frontend Developer**              | Angular components, screens, frontend tests  |
| **QA Engineer**                     | E2E tests, regression tests, test reporting  |

### 11.2 Add Collaborators

1. Go to repository on GitHub
2. **Settings → Collaborators → Add people**
3. Invite team members by GitHub username or email

### 11.3 Access Levels

| Role                    | Access Level          |
| ----------------------- | --------------------- |
| Repository Owner        | Admin                 |
| Backend Developer(s)    | Write                 |
| Frontend Developer(s)   | Write                 |
| QA Engineer(s)          | Write (for test code) |
| Stakeholders (optional) | Read                  |

---

## 12. FIRST STEPS FOR DEVELOPMENT TEAM

### Week 1 – Repository Foundation

| Task                                          | Assigned To      | Output                                      |
| --------------------------------------------- | ---------------- | ------------------------------------------- |
| 1. Clone empty repository                     | All team members | Local copy                                  |
| 2. Create `.gitignore` for .NET and Angular | Lead dev         | `.gitignore` file                         |
| 3. Initialize .NET Core solution              | Backend dev      | `EncounterDaily.sln`                      |
| 4. Initialize Angular/Ionic project           | Frontend dev     | `frontend/` with Ionic skeleton           |
| 5. Create CI workflow file                    | DevOps/Lead      | `.github/workflows/ci.yml`                |
| 6. Push initial structure                     | All              | First commit on `main` and `develop`    |
| 7. Configure branch protection                | Repo owner       | Protected `main` and `develop` branches |

---

## 13. VERIFICATION CHECKLIST

After repository setup, verify the following:

* Repository is accessible at `https://github.com/jkanimea/dailyreadingApp.git`
* `main` branch exists
* `develop` branch exists
* Branch protection rules are configured (require PR, require status checks, require reviews)
* GitHub Actions secrets are added (OAuth keys, connection strings, Azure publish profiles)
* `ci.yml` and `deploy.yml` workflow files are created
* `.gitignore` properly excludes build artifacts
* `CODEOWNERS` file exists and assigns reviewers by area
* README.md contains basic project information
* Version numbering strategy agreed upon (SemVer: `vMAJOR.MINOR.PATCH`)
* All team members have been invited as collaborators

---

## 14. TROUBLESHOOTING

| Issue                      | Solution                                                      |
| -------------------------- | ------------------------------------------------------------- |
| Cannot push to `main`    | Branch protection enabled – create PR instead                |
| CI pipeline fails          | Check test output; ensure all tests pass locally first        |
| Secrets not working        | Verify secret names match workflow file                       |
| Merge conflicts            | Rebase feature branch on latest `develop`                   |
| Commit not linked to issue | Include `#issue-number` in commit message or PR description |

---

## 15. NOTES FOR DEVELOPER

* This is a **greenfield project** – no existing code to review or migrate
* Implement the complete specifications (application + testing) as provided
* Use this repository as the **single source of truth** for all code
* All work must be done through  **Pull Requests** , never directly on `main` or `develop`
* The CI pipeline must be **passing** before any PR can be merged
* Keep commits small, focused, and descriptive
