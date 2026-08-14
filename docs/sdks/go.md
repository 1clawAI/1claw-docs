---
title: Go SDK
description: Official Go SDK for the 1claw Vault API — secrets management, agent auth, transaction signing, and more.
sidebar_position: 3
---

# Go SDK

Typed Go client for the 1Claw Vault API. Built for microservices, operators, and CI jobs already written in Go.

Covers vaults, secrets, agents, policies, billing, audit, treasury, Intents API signing, execution bindings, and platform apps. Agent API keys exchange for JWTs the same way as the TypeScript and Python SDKs.

For AI agents in IDEs, use the [MCP server](/docs/integrations/mcp-integration) instead of embedding this client in agent prompts.

## Installation

```bash
go get github.com/1clawAI/1claw-go-sdk
```

Requires **Go 1.21+**.

## Quick start

```go
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	oneclaw "github.com/1clawAI/1claw-go-sdk"
)

func main() {
	client, err := oneclaw.NewClient(
		oneclaw.WithBaseURL("https://api.1claw.xyz"),
		oneclaw.WithAPIKey(os.Getenv("ONECLAW_API_KEY")),
	)
	if err != nil {
		log.Fatal(err)
	}

	ctx := context.Background()

	// List vaults
	vaults, err := client.Vaults.List(ctx)
	if err != nil {
		log.Fatal(err)
	}
	for _, v := range vaults {
		fmt.Printf("Vault: %s (%s)\n", v.Name, v.ID)
	}

	// Get a secret
	secret, err := client.Secrets.Get(ctx, "VAULT_ID", "api-keys/openai")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Secret value:", secret.Value)
}
```

## Agent authentication

Agents authenticate by exchanging their `ocv_` API key for a short-lived JWT. The SDK handles token exchange and auto-refresh.

```go
client, err := oneclaw.NewClient(
	oneclaw.WithBaseURL("https://api.1claw.xyz"),
	oneclaw.WithAgentAuth(
		os.Getenv("ONECLAW_AGENT_ID"),
		os.Getenv("ONECLAW_AGENT_API_KEY"),
	),
)
if err != nil {
	log.Fatal(err)
}

// Token exchange happens automatically on first request.
// The SDK refreshes the JWT 60 seconds before expiry.
secret, err := client.Secrets.Get(ctx, "VAULT_ID", "api-keys/stripe")
```

You can also use key-only auth (no agent ID required — resolved from the key prefix):

```go
client, err := oneclaw.NewClient(
	oneclaw.WithBaseURL("https://api.1claw.xyz"),
	oneclaw.WithAgentAPIKey(os.Getenv("ONECLAW_AGENT_API_KEY")),
)
```

## Available services

| Service        | Description                                      |
|----------------|--------------------------------------------------|
| `Auth`         | Token exchange, federation, MFA                  |
| `Vaults`       | Create, list, get, delete vaults                 |
| `Secrets`      | CRUD, versioning, rotation, CMEK                 |
| `Agents`       | Register, update, list, delete agents            |
| `Policies`     | Access policy management                         |
| `Sharing`      | Share secrets (links, email, agent-to-human)     |
| `Chains`       | List supported blockchains                       |
| `Billing`      | Subscription status, credits, usage              |
| `Audit`        | Query audit events                               |
| `Platform`     | Platform API (apps, templates, bootstrap)        |
| `SigningKeys`  | Multi-chain signing key lifecycle                |
| `Treasury`     | Treasury multisigs and access requests           |

## Submit a transaction (Intents API)

```go
tx, err := client.Agents.SubmitTransaction(ctx, agentID, &oneclaw.SubmitTransactionRequest{
	Chain:   "ethereum",
	ChainID: 1,
	To:      "0xRecipientAddress",
	Value:   "0.01",
	Data:    "0x",
})
if err != nil {
	log.Fatal(err)
}
fmt.Printf("TX hash: %s, status: %s\n", tx.TxHash, tx.Status)
```

## Error handling

All methods return a typed `*oneclaw.Error` when the API responds with 4xx/5xx:

```go
secret, err := client.Secrets.Get(ctx, vaultID, "missing/path")
if err != nil {
	var apiErr *oneclaw.Error
	if errors.As(err, &apiErr) {
		fmt.Printf("Status: %d, Detail: %s\n", apiErr.StatusCode, apiErr.Detail)
	}
}
```

## Links

- [GitHub repository](https://github.com/1clawAI/1claw-go-sdk)
- [API reference](/docs/reference/api-reference)
- [OpenAPI spec](https://www.npmjs.com/package/@1claw/openapi-spec)
- [SDKs overview](/docs/sdks/overview)
