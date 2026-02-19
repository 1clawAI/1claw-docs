---
title: Email Notifications
description: 1Claw sends transactional emails for important account events via Resend.
sidebar_position: 9
---

# Email Notifications

1Claw sends transactional email notifications for important security and account events. Emails are powered by [Resend](https://resend.com) and are sent asynchronously — they never block API responses.

## Notification events

| Event                      | Recipient       | When                                                            |
| -------------------------- | --------------- | --------------------------------------------------------------- |
| **Welcome**                | New user        | Account created via email/password signup or Google OAuth       |
| **Secret shared**          | Share recipient | A secret is shared with them via email (`external_email` share) |
| **Shared secret accessed** | Share creator   | Someone accesses a secret the user shared                       |
| **Password changed**       | User            | Password is successfully changed                                |
| **API key created**        | User            | A new personal API key is created on their account              |

## Configuration

Email sending requires a Resend API key. Set these environment variables on the vault server:

| Variable             | Required | Default                     | Description                    |
| -------------------- | -------- | --------------------------- | ------------------------------ |
| `RESEND_API_KEY`     | Yes      | —                           | Your Resend API key (`re_...`) |
| `ONECLAW_EMAIL_FROM` | No       | `1Claw <noreply@1claw.xyz>` | Sender address                 |
| `ONECLAW_PUBLIC_URL` | No       | `https://1claw.xyz`         | Base URL for links in emails   |

If `RESEND_API_KEY` is not set, email sending is silently skipped and a log message is emitted instead. This is useful for local development.

## Self-hosting

If you're self-hosting 1Claw:

1. Create a free [Resend](https://resend.com) account.
2. Add and verify your domain in Resend.
3. Create an API key and set `RESEND_API_KEY` in your environment.
4. Set `ONECLAW_EMAIL_FROM` to a sender address on your verified domain.
5. Set `ONECLAW_PUBLIC_URL` to your dashboard URL so email links work correctly.

## Email design

All emails use inline CSS for maximum email client compatibility. They follow a dark theme consistent with the 1Claw brand and include:

- Clear subject lines describing the event
- Action buttons linking to the dashboard
- Footer with support contact information
