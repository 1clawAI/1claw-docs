---
title: Shroud Configuration & Operations
description: Global Shroud settings, configuration examples, use-case tuning, Shroud Activity dashboard, monitoring, and best practices.
keywords: [Shroud, configuration, monitoring, Shroud Activity]
sidebar_label: Configuration & ops
---

## Global Settings

### Sanitization Mode

Controls what happens when threats are detected:

| Mode | Behavior |
|------|----------|
| `block` | Reject the entire request with 403 |
| `surgical` | Remove only the malicious content, continue processing |
| `log_only` | Allow the request but audit the threat |

```typescript
sanitization_mode: "block"  // block | surgical | log_only
```

### Threat Logging

When enabled, all detected threats are logged to the audit system regardless of the action taken:

```typescript
threat_logging: true
```

This is essential for:
- Understanding your traffic patterns before enabling blocking
- Security incident investigation
- Compliance requirements

---

## Configuration Examples

### Full Configuration

```typescript
const agent = await client.agents.create({
  name: "my-secure-agent",
  shroud_enabled: true,
  shroud_config: {
    // Basic Shroud settings
    pii_policy: "redact",
    injection_threshold: 0.7,
    context_injection_threshold: 0.7,
    enable_secret_redaction: true,
    enable_response_filtering: true,
    
    // Rate limits and budget
    max_requests_per_minute: 60,
    max_requests_per_day: 10000,
    max_tokens_per_request: 8192,
    daily_budget_usd: 50,
    allowed_providers: ["openai", "anthropic", "google"],
    allowed_models: [],
    denied_models: [],
    
    // Threat detection
    unicode_normalization: {
      enabled: true,
      strip_zero_width: true,
      normalize_homoglyphs: true,
      normalization_form: "NFKC"
    },
    command_injection_detection: {
      enabled: true,
      action: "block",
      patterns: "default"
    },
    social_engineering_detection: {
      enabled: true,
      action: "warn",
      sensitivity: "medium"
    },
    encoding_detection: {
      enabled: true,
      action: "warn",
      detect_base64: true,
      detect_hex: true,
      detect_unicode_escape: true
    },
    network_detection: {
      enabled: true,
      action: "warn",
      blocked_domains: ["pastebin.com", "ngrok.io"],
      allowed_domains: []
    },
    filesystem_detection: {
      enabled: false,
      action: "log",
      blocked_paths: ["/etc/passwd", "~/.ssh/"]
    },
    tool_call_inspection: {
      enabled: true,
      allowed_tool_names: [],
      denied_tool_names: ["execute_sql", "shell_exec"],
      scan_arguments: true,
      block_credential_exfil: true,
      action: "block"
    },
    output_policy: {
      enabled: true,
      blocked_patterns: [],
      blocked_entities: [],
      block_harmful_content: true,
      harmful_categories: ["violence", "self_harm", "illegal", "hate", "sexual", "malware"],
      action: "block"
    },
    secret_injection_detection: {
      enabled: true,
      action: "warn",
      sensitivity: "medium"
    },
    advanced_redaction: {
      enabled: true,
      detect_base64_encoded: true,
      detect_split_secrets: true,
      detect_prefix_leak: true,
      min_secret_length: 8
    },
    semantic_policy: {
      enabled: false,
      allowed_topics: [],
      denied_topics: [],
      allowed_tasks: [],
      denied_tasks: [],
      action: "warn"
    },
    flagged_request_retention_days: 30,
    sanitization_mode: "block",
    threat_logging: true
  }
});
```

### Security Presets

#### Strict (Production)

Maximum protection for high-security environments:

```typescript
{
  unicode_normalization: { enabled: true, normalize_homoglyphs: true },
  command_injection_detection: { enabled: true, action: "block", patterns: "strict" },
  social_engineering_detection: { enabled: true, action: "block", sensitivity: "high" },
  encoding_detection: { enabled: true, action: "block" },
  network_detection: { enabled: true, action: "block" },
  filesystem_detection: { enabled: true, action: "block" },
  tool_call_inspection: { enabled: true, scan_arguments: true, block_credential_exfil: true, action: "block" },
  output_policy: { enabled: true, block_harmful_content: true, action: "block" },
  secret_injection_detection: { enabled: true, action: "block", sensitivity: "high" },
  advanced_redaction: { enabled: true, detect_base64_encoded: true, detect_split_secrets: true, detect_prefix_leak: true },
  semantic_policy: { enabled: true, action: "block" },
  sanitization_mode: "block",
  threat_logging: true
}
```

#### Balanced (Default)

Good protection with minimal false positives:

```typescript
{
  unicode_normalization: { enabled: true },
  command_injection_detection: { enabled: true, action: "block" },
  social_engineering_detection: { enabled: true, action: "warn" },
  encoding_detection: { enabled: true, action: "warn" },
  network_detection: { enabled: true, action: "warn" },
  filesystem_detection: { enabled: false },
  tool_call_inspection: { enabled: true, scan_arguments: true, block_credential_exfil: true, action: "warn" },
  output_policy: { enabled: true, block_harmful_content: true, action: "warn" },
  secret_injection_detection: { enabled: true, action: "warn" },
  advanced_redaction: { enabled: true, detect_base64_encoded: true },
  semantic_policy: { enabled: false },
  sanitization_mode: "block",
  threat_logging: true
}
```

#### Permissive (Development)

Observe traffic patterns without blocking:

```typescript
{
  unicode_normalization: { enabled: true },
  command_injection_detection: { enabled: true, action: "log" },
  social_engineering_detection: { enabled: true, action: "log" },
  encoding_detection: { enabled: true, action: "log" },
  network_detection: { enabled: true, action: "log" },
  filesystem_detection: { enabled: false },
  tool_call_inspection: { enabled: true, action: "log" },
  output_policy: { enabled: false },
  secret_injection_detection: { enabled: true, action: "log" },
  advanced_redaction: { enabled: false },
  semantic_policy: { enabled: false },
  sanitization_mode: "log_only",
  threat_logging: true
}
```

---

## Use Case Tuning

### Coding Assistants

Coding assistants legitimately discuss shell commands, file paths, and encoded content:

```typescript
{
  command_injection_detection: { enabled: true, action: "warn" },  // Don't block code examples
  encoding_detection: { enabled: true, action: "log" },           // Base64 is common in code
  filesystem_detection: { enabled: false },                        // Paths discussed constantly
  social_engineering_detection: { enabled: true, action: "warn" },
  sanitization_mode: "log_only"  // Learn patterns first
}
```

### Financial/Trading Agents

High-value targets require strict protection:

```typescript
{
  command_injection_detection: { enabled: true, action: "block", patterns: "strict" },
  social_engineering_detection: { enabled: true, action: "block", sensitivity: "high" },
  network_detection: { 
    enabled: true, 
    action: "block",
    allowed_domains: ["api.exchange.com", "api.bank.com"]  // Allowlist mode
  },
  sanitization_mode: "block"
}
```

### Customer Support Agents

Balance security with usability:

```typescript
{
  command_injection_detection: { enabled: true, action: "block" },
  social_engineering_detection: { enabled: true, action: "warn", sensitivity: "low" },
  encoding_detection: { enabled: false },  // Customers share screenshots as base64
  network_detection: { enabled: true, action: "warn" },
  sanitization_mode: "surgical"  // Remove threats but process the rest
}
```

---

## Dashboard Configuration

Navigate to **Agents** → *[Your Agent]* → **Shroud LLM Proxy** to configure security features in the Dashboard.

The "Threat Detection" section shows:
- Toggle switches for each detection category
- Dropdown selectors for actions (block/warn/log)
- Current status badges showing what's enabled

---

## Shroud Activity & Live Inspector

Shroud logs every inspection event — both clean requests and flagged threats. The dashboard provides three views for monitoring agent LLM traffic:

### Shroud Activity API (REST)

Programmatic access uses the **Vault API** (e.g. `https://api.1claw.xyz`), authenticated with a human JWT or user API key — not the Shroud agent headers.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/shroud/activity` | Recent Shroud inspection events across your org’s agents (feeds the dashboard overview). |
| POST | `/v1/shroud/activity` | Filtered or paginated activity queries (body parameters align with dashboard filtering). |

The **Live** dashboard view adds a real-time **SSE** stream for events as they arrive; list/query traffic uses the REST endpoints above.

### Shroud Activity (Overview)

**Dashboard:** Navigate to **Shroud Activity** in the sidebar (or `/shroud-activity`).

Shows recent Shroud inspection events across all agents:
- Request timestamp, agent name, provider, model
- Inspection result (clean, warned, blocked)
- Threat detectors that fired and their severity
- Quick filters by agent, provider, and result

### Threats

**Dashboard:** **Shroud Activity → Threats** (or `/shroud-activity/threats`).

Filtered view showing only threat detections — blocked and warned requests:
- Severity breakdown (critical, high, medium, low)
- Detector breakdown (which filters caught what)
- Drill-down into individual flagged requests
- Useful for security reviews and tuning detection thresholds

### Live Inspector (SSE)

**Dashboard:** **Shroud Activity → Live** (or `/shroud-activity/live`).

Real-time Server-Sent Events (SSE) stream of inspection events as they happen:
- Events appear instantly as agents send LLM requests through Shroud
- Each event shows the agent, provider, model, inspection result, and any threat detections
- Useful for debugging agent behavior, testing new `shroud_config` settings, and monitoring during deployments

For REST shapes and authentication, see [Shroud Activity API (REST)](#shroud-activity-api-rest) above.

### LLM Token Billing (Stripe AI Gateway)

When your organization has [LLM Token Billing](/docs/guides/billing-and-usage#llm-token-billing-optional-add-on) enabled, Shroud can route LLM requests through the **Stripe AI Gateway**. This bills token usage directly to your org's Stripe subscription — no provider API keys needed.

How it works:
1. Enable LLM Token Billing via `POST /v1/billing/llm-token-billing/subscribe`
2. Agent JWTs automatically include `llm_token_billing: true` and `stripe_customer_id`
3. Shroud routes eligible requests to the Stripe AI Gateway provider, rewrites the model ID for the gateway, and sets `X-Stripe-Customer-ID` from the JWT
4. Token usage appears on your Stripe invoice

The `1claw proxy` CLI command works seamlessly with LLM Token Billing — agents can use any supported model without managing provider API keys.

---

## Best Practices

1. **Start with `action: "warn"`** — Understand your traffic patterns before enabling blocking
2. **Enable `threat_logging: true`** — Build an audit trail for investigation
3. **Use the right preset for your use case** — Coding assistants need different settings than financial agents
4. **Review logs regularly** — Tune sensitivity based on false positive rates
5. **Keep `filesystem_detection` disabled for coding assistants** — It generates many false positives
6. **Use allowlist mode for high-security agents** — More secure than blocklist for network detection
7. **Test in development first** — Use `sanitization_mode: "log_only"` to validate before production

---

## Monitoring and Alerts

Threat detections are available in:

- **Audit logs** — Query via `client.audit.query()` or the Dashboard
- **Inspection metadata** — Returned in response headers when threats are detected
- **Prometheus metrics** — `shroud_threats_detected_total` with labels for threat type

Set up alerts for:
- Spike in blocked requests (possible attack in progress)
- New threat patterns from specific agents (compromised agent?)
- High false positive rates (tuning needed)
