---
title: Messaging Channels
description: Connect agents to Telegram, WhatsApp, and Discord for bi-directional messaging.
sidebar_position: 45
---

# Messaging Channels

Connect your 1Claw agents to external messaging platforms so they can receive and respond to messages automatically via Shroud LLM proxy.

## Supported platforms

| Platform | Webhook verification | Image delivery |
|----------|---------------------|----------------|
| Telegram | Bot token validation | `sendPhoto` API |
| WhatsApp | HMAC-SHA256 (`X-Hub-Signature-256`) | Media URL |
| Discord | Interaction signature verification | Embed |

## Creating a channel

```bash
# Via CLI
1claw agent channel create <agent-id> --type telegram --name "Support Bot"

# Via SDK
const channel = await client.agents.createChannel(agentId, {
  channel_type: "telegram",
  channel_name: "Support Bot",
  metadata: { bot_token: "..." }
});
```

Or use the **Channels card** on the agent detail page in the dashboard.

## Auto-respond

When `auto_respond_enabled` is `true` (default), inbound messages are automatically processed through the agent's Shroud LLM proxy and responses sent back via the channel.

### Sender allowlist

Restrict which sender IDs can trigger auto-respond:

```json
{
  "sender_allowlist": ["123456789", "987654321"],
  "auto_respond_enabled": true
}
```

When `sender_allowlist` is empty (default), all senders can trigger auto-respond.

## Image generation

When agent responses include image generation requests (e.g., DALL-E), the generated images are delivered inline:

- **Telegram**: Uses the `sendPhoto` API for inline image display
- **Dashboard chat**: Renders `media_url` in the conversation

## Webhook setup

Each channel gets a unique webhook URL at:

```
POST /v1/webhooks/{platform}/{webhook_path}
```

### Telegram
1. Create a channel with `channel_type: "telegram"` and your bot token in metadata
2. The webhook is automatically registered with the Telegram Bot API
3. Use `POST .../refresh-webhook` to repair if needed

### WhatsApp
1. Create a channel with `channel_type: "whatsapp"`
2. Configure the webhook URL in your WhatsApp Business API settings
3. The `GET` endpoint handles WhatsApp's verification challenge
4. Inbound webhooks are verified via HMAC-SHA256 signature

### Discord
1. Create a channel with `channel_type: "discord"`
2. Set the webhook URL as an Interactions Endpoint URL in your Discord application settings

## MCP tools

| Tool | Description |
|------|-------------|
| `create_channel` | Create a messaging channel for an agent |
| `list_channels` | List all channels for an agent |
| `send_channel_message` | Send a message via a configured channel |

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/agents/{id}/channels` | Create channel |
| `GET` | `/v1/agents/{id}/channels` | List channels |
| `PATCH` | `/v1/agents/{id}/channels/{cid}` | Update channel |
| `DELETE` | `/v1/agents/{id}/channels/{cid}` | Delete channel |
| `POST` | `/v1/agents/{id}/channels/{cid}/send` | Send message |
| `POST` | `/v1/agents/{id}/channels/{cid}/test` | Test connectivity |
| `POST` | `/v1/agents/{id}/channels/{cid}/refresh-webhook` | Refresh webhook |
| `GET` | `/v1/agents/{id}/channels/{cid}/messages` | List messages |
