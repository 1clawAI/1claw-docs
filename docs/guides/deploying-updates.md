---
title: Deploying Updates
description: How to deploy updates to each component of the 1claw stack — vault API, dashboard, docs, and MCP server.
sidebar_position: 6
---

# Deploying Updates

Every component of 1claw auto-deploys on push to `main`. This guide explains how each deployment works and how to trigger manual deploys.

## Auto-deploy on push

| Component | Path trigger | Deploys to | Workflow |
|-----------|-------------|------------|----------|
| Vault API | `vault/**` | Cloud Run (`oneclaw-vault`) | `.github/workflows/deploy-vault.yml` |
| MCP Server | `packages/mcp/**` | Cloud Run (`oneclaw-mcp`) | `.github/workflows/deploy-mcp.yml` |
| Dashboard | `dashboard/**` | Vercel (`1claw.xyz`) | Vercel Git integration |
| Docs | `docs/**` | Vercel (`docs.1claw.xyz`) | Vercel Git integration |

## Vault API

The vault is a Rust binary deployed as a Docker container on Cloud Run.

### Auto-deploy flow

1. Push to `main` with changes in `vault/`.
2. GitHub Actions builds a Docker image (`linux/amd64`).
3. Image is pushed to Artifact Registry.
4. Cloud Run service `oneclaw-vault` is updated.

### Manual deploy

```bash
# From repo root
IMAGE="us-west1-docker.pkg.dev/YOUR_PROJECT/oneclaw/vault"
docker build --platform linux/amd64 -f vault/Dockerfile -t "$IMAGE:latest" vault/
docker push "$IMAGE:latest"
gcloud run services update oneclaw-vault --region us-west1 --image "$IMAGE:latest"
```

### Required GitHub secrets

| Secret | Value |
|--------|-------|
| `GCP_PROJECT_ID` | Your GCP project ID |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload Identity Federation provider |
| `GCP_SERVICE_ACCOUNT` | Service account email |

## MCP Server

The MCP server is a Node.js app deployed as a Docker container on Cloud Run.

### Auto-deploy flow

1. Push to `main` with changes in `packages/mcp/`.
2. GitHub Actions builds a Docker image.
3. Image is pushed to Artifact Registry.
4. Cloud Run service `oneclaw-mcp` is updated.

### Manual deploy

```bash
IMAGE="us-west1-docker.pkg.dev/YOUR_PROJECT/oneclaw/mcp"
docker build --platform linux/amd64 -f packages/mcp/Dockerfile -t "$IMAGE:latest" packages/mcp/
docker push "$IMAGE:latest"
gcloud run services update oneclaw-mcp --region us-west1 --image "$IMAGE:latest"
```

Uses the same GitHub secrets as the vault.

## Dashboard

The Next.js dashboard is deployed to Vercel via Git integration.

### Auto-deploy flow

1. Push to `main` with changes in `dashboard/`.
2. Vercel detects the change and builds automatically.
3. Production deployment goes live at `1claw.xyz`.

### Manual deploy

```bash
cd dashboard
npx vercel --prod
```

### Vercel project settings

| Setting | Value |
|---------|-------|
| Root Directory | `dashboard` |
| Framework | Next.js |
| Build Command | `pnpm build` |

## Docs

The Docusaurus docs site is deployed to Vercel via Git integration.

### Auto-deploy flow

1. Push to `main` with changes in `docs/`.
2. Vercel detects the change and builds automatically.
3. Production deployment goes live at `docs.1claw.xyz`.

### Manual deploy

```bash
cd docs
npx vercel --prod
```

### Vercel project settings

| Setting | Value |
|---------|-------|
| Root Directory | `docs` |
| Build Command | `pnpm run build` |
| Output Directory | `build` |

## Infrastructure changes

Changes to `infra/` (Terraform) are not auto-deployed. Apply manually:

```bash
cd infra
terraform plan    # Review changes
terraform apply   # Apply
```

This is intentional — infrastructure changes should be reviewed before applying.
