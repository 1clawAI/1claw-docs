---
sidebar_label: "Agent Communication — chat & channels"
title: "Agent Communication — Chat & Channels"
description: "Chat with agents from the dashboard and connect them to Telegram, WhatsApp, and Discord."
---

# Agent Communication

1Claw provides two ways to communicate with your agents:

1. **Dashboard Chat** — Send messages to agents directly from the dashboard or via API, with responses powered by Shroud LLM.
2. **External Channels** — Connect agents to Telegram, WhatsApp, and Discord for bidirectional messaging.

Both features require `shroud_enabled: true` on the agent for auto-responses.

---

## Dashboard Chat

### Overview

The dashboard chat lets you interact with agents in real time. Messages are routed through Shroud's LLM proxy, which applies your agent's Shroud config (PII redaction, injection detection, threat filtering) to every request and response.

### Features

- **SSE streaming** — Responses stream in real time via Server-Sent Events
- **Conversation management** — Messages are grouped into conversations with auto-generated titles
- **Model selection** — Choose the LLM provider and model per conversation
- **Full history** — All conversations and messages are persisted

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/agents/{id}/chat` | Send a message (SSE streaming with `Accept: text/event-stream`) |
| `GET` | `/v1/agents/{id}/chat/conversations` | List conversations |
| `GET` | `/v1/agents/{id}/chat/conversations/{cid}` | Get conversation with messages |
| `DELETE` | `/v1/agents/{id}/chat/conversations/{cid}` | Archive a conversation |

### SDK Example

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({
  baseUrl: "https://api.1claw.xyz",
  apiKey: "1ck_...",
});

// Send a message (non-streaming)
const { data } = await client.chat.sendMessage("agent-uuid", {
  message: "What secrets do I have access to?",
  model: "gpt-4o",
  provider: "openai",
});

console.log(data.message.content);

// SSE streaming
const response = await client.chat.sendMessageStream("agent-uuid", {
  message: "Summarize my vault activity",
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  process.stdout.write(decoder.decode(value));
}

// List conversations
const { data: convos } = await client.chat.listConversations("agent-uuid");
console.log(convos.conversations);
```

### CLI Example

```bash
# Send a message
1claw chat send <agent-id> "What's the current ETH gas price?"

# List conversations
1claw chat list <agent-id>

# View conversation messages
1claw chat get <agent-id> <conversation-id>

# Archive a conversation
1claw chat delete <agent-id> <conversation-id>
```

### MCP Tools

- **`send_chat_message`** — Send a message and get the response
- **`list_chat_conversations`** — List conversations for an agent

---

## External Channels {#channels}

### Overview

Connect your agents to external messaging platforms. When a user sends a message on Telegram, WhatsApp, or Discord, it's received via webhook, processed through Shroud LLM (if enabled), and the response is sent back automatically.

### Supported Platforms

| Platform | Config Keys | Webhook |
|----------|------------|---------|
| **Telegram** | `bot_token` | `POST /v1/webhooks/telegram/{path}` |
| **WhatsApp** | `phone_number_id`, `access_token`, `verify_token` | `GET/POST /v1/webhooks/whatsapp/{path}` |
| **Discord** | `bot_token`, `application_id` | `POST /v1/webhooks/discord/{path}` |

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/agents/{id}/channels` | Register a channel (human-only) |
| `GET` | `/v1/agents/{id}/channels` | List channels |
| `PATCH` | `/v1/agents/{id}/channels/{cid}` | Update channel |
| `DELETE` | `/v1/agents/{id}/channels/{cid}` | Delete channel |
| `POST` | `/v1/agents/{id}/channels/{cid}/send` | Send outbound message |
| `GET` | `/v1/agents/{id}/channels/{cid}/messages` | Message history |

### Telegram Setup

1. Create a bot via [@BotFather](https://t.me/BotFather) on Telegram
2. Copy the bot token
3. Register the channel:

```bash
1claw channel create <agent-id> \
  --type telegram \
  --name "My Support Bot" \
  --config '{"bot_token":"123456:ABC-DEF..."}'
```

4. Copy the webhook URL from the response
5. Set the webhook with Telegram:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"<WEBHOOK_URL>"}'
```

### WhatsApp Cloud API Setup

1. Create a Meta Business App at [developers.facebook.com](https://developers.facebook.com)
2. Add the WhatsApp product and get your phone number ID and access token
3. Register the channel:

```bash
1claw channel create <agent-id> \
  --type whatsapp \
  --name "Support WhatsApp" \
  --config '{"phone_number_id":"1234567890","access_token":"EAA...","verify_token":"my-secret-verify-token"}'
```

4. In the Meta dashboard, set the webhook URL to the returned `webhook_url`
5. Use the `verify_token` you provided as the verification token

### Discord Bot Setup

1. Create an application at [discord.com/developers](https://discord.com/developers/applications)
2. Add a bot and copy the bot token
3. Register the channel:

```bash
1claw channel create <agent-id> \
  --type discord \
  --name "Discord Bot" \
  --config '{"bot_token":"MTIz...","application_id":"1234567890"}'
```

4. Set the interactions endpoint URL in the Discord developer portal to the returned `webhook_url`

### SDK Example

```typescript
// Register a Telegram channel
const { data: channel } = await client.channels.create("agent-uuid", {
  channel_type: "telegram",
  channel_name: "Support Bot",
  config: { bot_token: "123456:ABC-DEF..." },
});

console.log("Webhook URL:", channel.webhook_url);

// Send an outbound message
await client.channels.sendMessage("agent-uuid", channel.id, {
  external_chat_id: "123456789",
  content: "Hello from 1Claw!",
});

// List message history
const { data: history } = await client.channels.listMessages(
  "agent-uuid",
  channel.id,
  50,
);

for (const msg of history.messages) {
  console.log(`[${msg.direction}] ${msg.sender_name}: ${msg.content}`);
}
```

### CLI Example

```bash
# List channels for an agent
1claw channel list <agent-id>

# Send a message via a channel
1claw channel send <agent-id> <channel-id> \
  --chat-id "123456789" \
  --message "Hello from CLI!"

# View message history
1claw channel messages <agent-id> <channel-id>

# Disable a channel
1claw channel update <agent-id> <channel-id> --active false

# Delete a channel
1claw channel delete <agent-id> <channel-id>
```

### MCP Tools

- **`create_channel`** — Register a messaging channel
- **`list_channels`** — List channels for an agent
- **`send_channel_message`** — Send an outbound message via a channel

---

## Security

- Channel credentials (bot tokens, access tokens) are stored encrypted in the `__agent-keys` vault at `agents/{id}/channels/{type}/config`
- All inbound messages pass through the Shroud inspection pipeline (PII, injection, threat detection)
- Channel registration is human-only — agents cannot create their own channels
- Outbound messages are rate-limited per channel

## Billing

Chat and channel features are available on all tiers. LLM usage for auto-responses follows your agent's Shroud LLM billing configuration (see [LLM Token Billing](/docs/guides/billing-and-usage#llm-token-billing-optional-add-on)).
