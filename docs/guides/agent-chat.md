---
title: Agent Chat
description: Chat with agents via the Shroud LLM proxy with persistent conversation history.
sidebar_position: 44
---

# Agent Chat

Send messages to agents through the Shroud LLM proxy. Conversations persist across sessions with full message history.

## Sending a message

```typescript
// SDK
const response = await client.chat.sendMessage(agentId, {
  message: "What API keys do I have stored?",
  conversation_id: conversationId, // optional, creates new if omitted
  model: "gpt-4o",
  provider: "openai"
});
```

### SSE streaming

```typescript
const stream = await client.chat.sendMessageStream(agentId, {
  message: "Analyze my vault secrets",
});

const reader = stream.body.getReader();
// Process SSE events...
```

## Runtime chat

Chat directly with agents running in cloud runtimes via an OpenAI-compatible in-container bridge:

```
POST /v1/runtimes/{id}/chat
```

Step-up auth may be required first:

```
POST /v1/runtimes/{id}/chat/unlock
```

The dashboard shows a **Chat** tab alongside the Terminal on runtime detail pages.

## Conversations

List and manage conversations:

```typescript
const conversations = await client.chat.listConversations(agentId);
const detail = await client.chat.getConversation(agentId, conversationId);
await client.chat.deleteConversation(agentId, conversationId);
```

## MCP tools

| Tool | Description |
|------|-------------|
| `send_chat_message` | Send a message to an agent and get a response |
| `list_chat_conversations` | List agent chat conversations |

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/agents/{id}/chat` | Send message (SSE streaming) |
| `POST` | `/v1/agents/{id}/chat/unlock` | Step-up auth to unlock chat |
| `GET` | `/v1/agents/{id}/chat/conversations` | List conversations |
| `GET` | `/v1/agents/{id}/chat/conversations/{cid}` | Get conversation |
| `DELETE` | `/v1/agents/{id}/chat/conversations/{cid}` | Delete conversation |
| `POST` | `/v1/runtimes/{id}/chat` | Runtime chat (SSE) |
| `POST` | `/v1/runtimes/{id}/chat/unlock` | Runtime chat unlock |
