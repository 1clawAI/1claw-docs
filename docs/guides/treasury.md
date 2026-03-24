---
title: Treasury (Safe multisigs)
description: Manage organization treasuries backed by Gnosis Safe–style multisigs—signers, thresholds, and agent access requests—via the API and dashboard.
sidebar_label: Treasury (Safe multisigs)
sidebar_position: 0
tags: [treasury, safe, multisig]
---

# Treasury (Safe multisigs)

**Treasury** lets your org track **Safe multisig** treasuries: name, chain, Safe address, signer list, and threshold. Humans manage treasuries in the dashboard; **agents** can **request access**, and owners can **approve** or **deny** those requests.

Use this when you need **shared onchain custody** metadata and **gated agent access** to treasury context—not raw private keys in agent prompts.

## What you can do

- **Create** a treasury with **`POST /v1/treasury`** (name, `safe_address`, optional chain / `chain_id`, threshold, signers).  
- **List** treasuries: **`GET /v1/treasury`**.  
- **Get / update / delete** a treasury: **`GET`**, **`PATCH`**, **`DELETE /v1/treasury/{id}`**.  
- **Add or remove signers** on a treasury.  
- **Access requests:** agent **`POST .../access-requests`**, human **`GET .../access-requests`**, **`.../approve`**, **`.../deny`**.

Full REST details live in the **[API reference](/docs/reference/api-reference)** (search for `treasury`).

## Dashboard

In the app, open **Treasury** (`/treasury`) to create treasuries, edit signers and threshold, and handle access requests. See also **[Intents API](/docs/guides/intents-api)** for agent transaction signing and smart accounts, which complement treasury workflows.

## Related

- [Intents API](/docs/guides/intents-api) — signing and guardrails  
- [Human API overview](/docs/human-api/overview) — authentication for treasury endpoints  
