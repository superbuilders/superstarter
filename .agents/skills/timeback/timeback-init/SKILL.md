---
name: timeback-init
description: Initialize a project for Timeback integration. Detects the project setup (TypeScript or Python), configures environment variables, and guides the developer through CLI setup (credentials, config, course provisioning). No packages are installed and no code is generated — those steps are handled by the timeback-server skill. Use when a developer wants to set up Timeback in their project for the first time.
---

# Timeback Init

Set up the Timeback project infrastructure: environment detection, environment variables,
CLI-driven config/course setup, and the integration tracking file.

This skill handles **configuration only** — no packages are installed and no code modules
are created. Package installation and SDK setup are handled by `timeback-server`, which
knows whether to install `@timeback/sdk` (TypeScript) or `timeback-sdk` / `timeback-core`
(Python) based on the project's architecture.

**Agent vs. developer responsibilities:**

| Task | Who | Why |
|------|-----|-----|
| Detect project | Agent | Reads the codebase |
| Set up `.env` | Agent | Writes config files |
| Set up credentials (`timeback credentials add`) | Developer | Requires API keys |
| Create config + provision courses (`timeback init --sync`) | Developer | Interactive — prompts for app name, courses, launch URL, org selection |
| Verify | Agent | Runs CLI check |

## Resume

If `timeback-integration.md` exists at the project root, read it and check the
Status section. If `timeback-init` is already marked complete, verify the state
is still valid:

- `.env` has `TIMEBACK_CLIENT_ID`, `TIMEBACK_CLIENT_SECRET`, `TIMEBACK_ENV`
- `timeback.config.json` exists with courses and `ids`

If everything checks out, skip to Step 5 (update the integration file).
If something is missing, resume from the relevant step.

## Step 1: Detect Project

Examine the project root to determine the **language** first, then the stack details.

### Language detection

| Signal | Language |
|--------|----------|
| `package.json` exists | **TypeScript / JavaScript** |
| `pyproject.toml`, `requirements.txt`, or `Pipfile` exists | **Python** |
| Both exist | Ask the developer which SDK to integrate |

### TypeScript / JavaScript details

| Check | How | Values |
|-------|-----|--------|
| Package manager | Lock file | `bun.lockb` → bun, `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `package-lock.json` → npm |
| Language | `tsconfig.json` exists | Yes → TypeScript, No → JavaScript |
| Framework | `package.json` dependencies | `next` → Next.js, `express` → Express, `fastify` → Fastify, `hono` → Hono (use native adapter), `@remix-run/node` → Remix, `electron` → Electron, none → Node.js |
| Module system | `package.json` `"type"` field | `"module"` → ESM, otherwise → CJS |

### Python details

| Check | How | Values |
|-------|-----|--------|
| Package manager | Config file | `pyproject.toml` with `[tool.uv]` → uv, `pyproject.toml` with `[tool.poetry]` → poetry, `Pipfile` → pipenv, `requirements.txt` → pip |
| Framework | Installed packages or imports | `fastapi` → FastAPI, `django` in `INSTALLED_APPS` or `manage.py` → Django, `flask` → Flask, none → plain Python |
| Python version | `pyproject.toml` `requires-python` or `.python-version` | Timeback requires Python 3.12+ |

## Step 2: Configure Environment Variables

**Before adding secrets**, verify `.env` is in `.gitignore`. If not, add `.env` to `.gitignore` first.

Add to `.env` (create if it doesn't exist):

```env
TIMEBACK_ENV=staging
TIMEBACK_CLIENT_ID=your-client-id
TIMEBACK_CLIENT_SECRET=your-client-secret
```

These variable names are the same for both TypeScript and Python.

If `.env.example` or `.env.template` exists, add the variable names there without values.

For the Python Server SDK with SSO identity, also add:

```env
TIMEBACK_SSO_CLIENT_ID=your-sso-client-id
TIMEBACK_SSO_CLIENT_SECRET=your-sso-client-secret
```

Tell the developer they need API credentials from Timeback if they don't have them yet.

## Step 3: CLI Setup (Developer)

The Timeback CLI handles config creation, course provisioning, and org selection
interactively. The agent cannot do these steps — they require developer input.

### 3a. Check for existing setup

Before asking the developer to run commands, check what already exists:

```bash
# Check if credentials are already configured
ls ~/.timeback/credentials.json

# Check if timeback.config.json already exists
ls timeback.config.json
```

### 3b. Guide the developer through CLI commands

Present the developer with the commands they need to run, skipping any that are
already done:

**If no credentials exist:**

```
Before we can continue, you need to set up the Timeback CLI.
Run these commands in your terminal:

  npx timeback credentials add
  npx timeback init --sync

The first command sets up your API credentials.
The second creates timeback.config.json and provisions your courses.
It will prompt you for:
  - App name
  - Subjects and grade levels
  - Launch URL (your app's production URL)
  - Which organization to create courses under
  - Which environment to push to (staging/production)

Let me know when you're done and I'll continue with the integration.
```

**If credentials exist but no config:**

```
You already have CLI credentials. Run this to create your config and provision courses:

  npx timeback init --sync

It will prompt you for your app name, courses, launch URL, and organization.
Let me know when you're done.
```

**If both exist:**

Skip to Step 4 — the developer is already set up.

### 3c. Verify the config was created

After the developer confirms they've run the commands, verify `timeback.config.json`
exists and has the expected structure:

- Check that `timeback.config.json` exists at the project root
- Check that it has a `name`, `courses` array, and either `sensor` or `launchUrl`
- Check that courses have `ids` populated (meaning `resources push` succeeded)

If `ids` are null or missing, the developer may need to run `npx timeback resources push --env staging`.

## Step 4: Verify

Use the CLI to confirm credentials work against Timeback:

```bash
# Quick auth check — list one user to confirm connectivity
npx timeback api oneroster users list --limit 1 --env staging
```

If this returns a user record, credentials are valid. If it fails:

```bash
# Check that credentials are configured
npx timeback credentials list

# Re-add if missing or wrong
npx timeback credentials add
```

The CLI check verifies the credentials themselves work. The full end-to-end check
(confirming the app loads credentials correctly from `.env`) happens later via the
verification endpoint created by `timeback-integrate`.

## Step 5: Update Integration File

Create or update `timeback-integration.md` at the project root.

If the file doesn't exist, create it with this structure:

```markdown
# Timeback Integration

## Status
- [x] timeback-init
- [ ] timeback-server
- [ ] timeback-client

## Project
- **Framework**: [detected framework]
- **Language**: [TypeScript or Python]
- **Package Manager**: [detected package manager]
- **Architecture**: [Browser app or Server-only]

## Auth
_Not yet configured._

## Courses
_Populated after course provisioning._

## Activity Map
_Not yet discovered. Run the activity skill to scan and map activities._
```

Fill in the **Project** section with the values detected in Step 1.

Fill in the **Courses** section from `timeback.config.json` if it exists.
For each course entry, add a line:

```
- [subject], Grade [grade] → `{ subject: "[subject]", grade: [grade] }`
```

If the file already exists, update the Status section to mark `timeback-init`
as complete and update the Project and Courses sections with current values.

## Error Recovery

| Error | Cause | Fix |
|-------|-------|-----|
| Auth error (401) | Bad credentials | Verify `TIMEBACK_CLIENT_ID` and `TIMEBACK_CLIENT_SECRET` in `.env` |
| Env vars undefined | `.env` not loaded | **TS:** add `import 'dotenv/config'`. **Python:** add `load_dotenv()` |
| Python version error | Python < 3.12 | Timeback Python SDK requires Python 3.12+ |
| `timeback.config.json` missing | CLI init not run | Developer must run `npx timeback init --sync` |
| Course `ids` are null | Courses not pushed | Developer must run `npx timeback resources push --env staging` |

## Constraints

- **Never hardcode credentials** — always use environment variables
- **Never generate `timeback.config.json`** — the CLI handles this interactively via `timeback init`
- **Start with staging** — use `TIMEBACK_ENV=staging` until verified
- **Token management is automatic** — both SDKs handle OAuth token caching and refresh
