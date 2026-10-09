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
1claw channel create <agent-id> \
  --type telegram \
  --name "Support Bot" \
  --config '{"bot_token":"..."}'

# Via SDK
const { data: channel } = await client.channels.create(agentId, {
  channel_type: "telegram",
  channel_name: "Support Bot",
  config: { bot_token: "..." },
});
```

Or use the **Channels card** on the agent detail page in the dashboard.

## Auto-respond

When `auto_respond_enabled` is `true` (default), inbound messages are automatically processed through the agent's Shroud LLM proxy and responses sent back via the channel.

### Sender allowlist

Restrict who can message the agent at all:

```json
{
  "sender_allowlist": ["123456789", "987654321"],
  "auto_respond_enabled": true
}
```

When `sender_allowlist` is empty (the default), anyone who finds the bot gets a
reply. **As soon as it has one entry, every other sender stops getting replies** —
it is a restriction, not an addition. Senders on the list may also run admin
slash commands.

Send `[]` to clear it; omitting the field leaves it unchanged.

## Admin slash commands

`/model`, `/personality`, `/stop`, `/compress` and the other state-changing
commands are refused unless the sender is authorized. Two things authorize them,
and they are not the same:

| Field | Who may run admin commands | Who may message the agent |
|-------|---------------------------|---------------------------|
| `owner_sender_id` | just that sender | unchanged — anyone |
| `sender_allowlist` (non-empty) | anyone on the list | **only** people on the list |

So `owner_sender_id` is the narrow one: it grants admin without closing the
channel to everyone else. Use the allowlist when you actually want a private
bot.

### The first person to message a new channel becomes its admin

On a channel with no allowlist, no `owner_sender_id`, and **no prior inbound
message**, the first sender is recorded as the admin automatically. For a
private bot whose operator messages it to check it works, that is the right
person and no configuration is needed.

The trade-off, stated plainly: for a bot you publish before configuring, whoever
messages it first during setup becomes the admin. Setting `sender_allowlist` at
create time, or `owner_sender_id` on update, pre-empts the claim — it only fires
when neither is set. The claim is recorded in the audit log as
`channel.owner.claimed`.

### Naming or revoking an admin

```bash
# Name an admin — does not restrict who can message the agent
1claw channel update <agent-id> <channel-id> --admin 123456789

# Revoke; "" sends an explicit null
1claw channel update <agent-id> <channel-id> --admin ""
```

```ts
await client.channels.update(agentId, channelId, { owner_sender_id: "123456789" });
await client.channels.update(agentId, channelId, { owner_sender_id: null }); // revoke
```

Or use **Agent → Channels → Admins** in the dashboard, which lists the senders
the channel has already received messages from so you can grant by name instead
of hunting for a numeric ID.

`null` revokes; omitting the field leaves the current admin alone. The two are
deliberately distinct, so an unrelated `PATCH` (pausing the channel, say) never
clears the admin as a side effect.

Revoking is durable on a channel that has already received a message. On a
channel with no inbound messages yet, the first-contact claim above still
applies, so the next person to message it becomes the admin.

:::note Finding your sender ID
For a one-to-one Telegram chat, the chat ID **is** the sender's user ID, so the
dashboard can offer senders it has seen. In a group, the ID identifies the group
rather than a person — everyone in it counts as that sender.
:::

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
