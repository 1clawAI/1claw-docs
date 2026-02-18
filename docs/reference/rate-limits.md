---
title: Rate limits
description: Rate limiting may be applied per org or per token; 429 responses indicate limit exceeded; exact limits depend on deployment.
sidebar_position: 2
---

# Rate limits

<!-- TODO: verify --> The vault API may enforce rate limits per organization or per token. When a limit is exceeded, the server returns **429 Too Many Requests** with a problem-details body.

Exact limits (requests per minute or per hour) depend on your deployment (e.g. Cloud Run and any API gateway in front). Check your infrastructure config or contact the operator. Common practice is to use exponential backoff and retry when you receive 429.
