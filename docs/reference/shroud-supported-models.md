---
title: Shroud supported models
description: Model IDs allowed per LLM provider in Shroud, aligned with server config. Use these strings in the request body or X-Shroud-Model.
sidebar_label: Shroud models
sidebar_position: 2
tags: [shroud, reference]
---

# Shroud supported models

Shroud validates the `model` field (JSON body and/or `X-Shroud-Model`) against an **allowlist per provider**. The lists below match the deployed Shroud configuration in the monorepo:

`shroud/config/providers/<provider>.toml` → `[provider.models].allowed`

If you add or rename models in production, update those TOML files first, then refresh this page.

---

## How to use these IDs

- Set **`X-Shroud-Provider`** to the provider name (see [Shroud guide](/docs/guides/shroud#supported-providers)).
- Pass the model as **`model` in the JSON body** (OpenAI-style chat) or **`X-Shroud-Model`**, using the exact strings in the tables below.
- For **`google`** / **`gemini`**, IDs are the short Gemini model names (e.g. `gemini-2.5-pro`).
- For **`openrouter`**, the allowlist is empty in config, meaning **any OpenRouter model slug** is accepted (e.g. `anthropic/claude-3.5-sonnet`). OpenRouter’s catalog is authoritative.

---

## OpenAI (`X-Shroud-Provider: openai`) {#openai-models}

| Model ID |
|----------|
| `gpt-4o` |
| `gpt-4o-mini` |
| `gpt-4.1` |
| `gpt-4.1-mini` |
| `gpt-4.1-nano` |
| `o1` |
| `o3` |
| `o3-mini` |
| `o4-mini` |

---

## Anthropic (`X-Shroud-Provider: anthropic`) {#anthropic-models}

| Model ID |
|----------|
| `claude-sonnet-4-5-20250929` |
| `claude-haiku-4-5-20251001` |
| `claude-opus-4-6` |

---

## Google Gemini (`X-Shroud-Provider: google` or `gemini`) {#google-gemini-models}

| Model ID | Notes |
|----------|--------|
| `gemini-2.5-pro` | |
| `gemini-2.5-flash` | Default called out in Shroud provider config comments |
| `gemini-2.0-flash` | Still on the allowlist; Google may deprecate or return errors for some accounts |

---

## Mistral (`X-Shroud-Provider: mistral`) {#mistral-models}

| Model ID |
|----------|
| `mistral-large-latest` |
| `mistral-medium-latest` |
| `mistral-small-latest` |
| `codestral-latest` |

---

## Cohere (`X-Shroud-Provider: cohere`) {#cohere-models}

| Model ID |
|----------|
| `command-r-plus` |
| `command-r` |
| `command-light` |

---

## OpenRouter (`X-Shroud-Provider: openrouter`) {#openrouter-models}

OpenRouter is itself a model routing gateway — it maintains its own catalog of available models and handles model resolution and validation on its backend. Because of this, Shroud’s config uses an **empty** allowlist for OpenRouter: there is no static list to maintain on the Shroud side. Any model slug that OpenRouter supports is accepted (for example `openai/gpt-4o`, `anthropic/claude-sonnet-4`, `google/gemini-2.5-pro`). See [OpenRouter models](https://openrouter.ai/models) for the full catalog.

---

## Darkbloom (`X-Shroud-Provider: darkbloom`) {#darkbloom-models}

[Darkbloom](https://darkbloom.dev) (an Eigen Labs project) routes inference to hardware-attested Apple Silicon providers with end-to-end encryption. It exposes an OpenAI-compatible API. Shroud's config uses an **empty** allowlist — any model available on Darkbloom is accepted. Check their `/v1/models` endpoint for real-time availability.

---

## Venice (`X-Shroud-Provider: venice`) {#venice-models}

[Venice AI](https://venice.ai) provides privacy-focused inference with no data retention. It exposes an OpenAI-compatible API. Shroud's config uses an **empty** allowlist — any model slug Venice supports is accepted (e.g. `claude-opus-4-8`, `grok-4-3`, `kimi-k2-6`). Check their `/api/v1/models` endpoint for available models.

---

## LLM Token Billing (Stripe AI Gateway)

When your org has [LLM Token Billing](/docs/guides/billing-and-usage#llm-token-billing-optional-add-on) enabled, Shroud can route traffic through the Stripe AI Gateway instead of your provider API key. You still send the same **`X-Shroud-Provider`** (`openai`, `anthropic`, `google`, `mistral`, `cohere`, etc.).

Shroud rewrites the request body so Stripe receives **`provider/model`** (e.g. `openai/gpt-4o-mini`, `google/gemini-2.5-pro`) when the body’s `model` has no `/`. If you already pass a qualified id (contains `/`), it is left unchanged.

The **`stripe`** provider entry in Shroud also uses an empty model allowlist; gateway-side availability follows Stripe’s documentation, not the fixed tables above.

---

## Policy allowlists (`shroud_config`)

Per-agent **`allowed_models`** / **`denied_models`** in `shroud_config` should use the **same strings** you send in requests (after any Stripe rewrite, the logical model is still the one you chose in your client). See [Shroud — per-agent configuration](/docs/guides/shroud#per-agent-configuration-shroud_config).

---

## Errors

If the model is not allowed for that provider, Shroud returns an error indicating the model is not permitted on that provider. Use an ID from the tables above (or a valid OpenRouter slug when using OpenRouter).
