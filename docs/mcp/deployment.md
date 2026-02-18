---
title: MCP Deployment
description: Deploy the 1claw MCP server to Cloud Run for hosted access at mcp.1claw.xyz, or self-host on any container platform.
sidebar_position: 4
---

# MCP Deployment

## Hosted deployment (Cloud Run)

The MCP server auto-deploys to Google Cloud Run on every push to `main` that modifies `packages/mcp/**`. The GitHub Actions workflow is at `.github/workflows/deploy-mcp.yml`.

### How it works

1. Push to `main` triggers the workflow.
2. Docker image is built and pushed to Artifact Registry.
3. Cloud Run service `oneclaw-mcp` is updated with the new image.
4. The service is available at its Cloud Run URL (and at `mcp.1claw.xyz` if domain mapping is configured).

### Infrastructure (Terraform)

The Cloud Run service and domain mapping are defined in `infra/main.tf`. To set up:

```hcl
# In infra/terraform.tfvars
mcp_domain = "mcp.1claw.xyz"
```

Then run `terraform apply`. This creates:

- `google_cloud_run_v2_service.mcp` — The Cloud Run service with health checks, auto-scaling (0–5 instances), and the vault API URL injected as an environment variable.
- `google_cloud_run_domain_mapping.mcp` — Maps `mcp.1claw.xyz` to the service (requires a CNAME DNS record pointing to Cloud Run).

### Environment variables (set automatically)

| Variable | Value | Source |
|----------|-------|--------|
| `MCP_TRANSPORT` | `httpStream` | Dockerfile default |
| `PORT` | `8080` | Dockerfile default |
| `ONECLAW_BASE_URL` | Vault Cloud Run URL | Terraform |

### Health check

The server exposes `GET /health` which returns `200 OK` with body `✓ Ok`. Cloud Run uses this for startup and liveness probes.

## Self-hosting

The MCP server is a standard Node.js Docker container. You can deploy it anywhere that runs containers.

### Docker

```bash
cd packages/mcp
docker build -t my-mcp-server .
docker run -p 8080:8080 \
  -e MCP_TRANSPORT=httpStream \
  -e ONECLAW_BASE_URL=https://api.1claw.xyz \
  my-mcp-server
```

### Required configuration

| Variable | Description |
|----------|-------------|
| `MCP_TRANSPORT` | Set to `httpStream` for hosted mode |
| `PORT` | HTTP port (default: `8080`) |
| `ONECLAW_BASE_URL` | Your vault API URL |

Note: In hosted mode, auth credentials come from client request headers (`Authorization` and `X-Vault-ID`), not from environment variables. The server creates a new vault client per connection using the caller's credentials.
