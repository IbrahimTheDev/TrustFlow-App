# Webhook Integration Setup Guide

This document explains how to set up the Webhook Integration feature for TrustFlow.

## Overview

The Webhook Integration feature allows users to:
- Add webhook URLs (Zapier, Slack, Make, Discord, etc.)
- Receive real-time notifications when new testimonials are submitted
- Test webhooks before going live
- Enable/disable webhooks without deleting them
- View detailed webhook delivery logs

## Prerequisites

1. Database tables and functions are already created (see SQL schema provided)
2. Supabase Edge Functions are enabled on your project
3. Backend server is running with the `/api/webhooks/test` endpoint

---

## Step 1: Deploy the Supabase Edge Function

### 1.1 Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

### 1.2 Login to Supabase

```bash
supabase login
```

### 1.3 Link Your Project

```bash
cd /workspaces/TrustFlow-App
supabase link --project-ref YOUR_PROJECT_REF
```

### 1.4 Deploy the Edge Function

```bash
supabase functions deploy process-webhooks --no-verify-jwt
```

> **Note:** We use `--no-verify-jwt` because this function is triggered by a Database Webhook, not by a user request.

---

## Step 2: Create the Database Webhook Trigger

This is the crucial step that connects your `testimonials` table to the Edge Function.

### 2.1 Go to Supabase Dashboard

1. Open your Supabase project dashboard
2. Navigate to **Database** → **Webhooks** (or **Database** → **Triggers** in newer versions)

### 2.2 Create a New Webhook

Click "Create a new webhook" and configure:

| Field | Value |
|-------|-------|
| **Name** | `testimonial-created-webhook` |
| **Table** | `testimonials` |
| **Events** | Check only `INSERT` |
| **Type** | `HTTP Request` |
| **Method** | `POST` |
| **URL** | `https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-webhooks` |

### 2.3 Add Headers

Add the following header to authenticate the webhook:

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer YOUR_SERVICE_ROLE_KEY` |
| `Content-Type` | `application/json` |

> **Security Warning:** Use your `service_role` key here, NOT the `anon` key. This is safe because the webhook is internal to Supabase.

### 2.4 Save the Webhook

Click "Create webhook" to save.

---

## Step 3: Verify the Setup

### 3.1 Test via the UI

1. Go to any Space's Settings tab
2. Add a webhook URL (you can use https://webhook.site for testing)
3. Click the "Test" button next to the webhook
4. Verify you receive the test payload

### 3.2 Test via Real Submission

1. Submit a new testimonial to a Space that has webhooks configured
2. Check the webhook endpoint for the delivery
3. Verify the payload contains testimonial data

### 3.3 Check Logs

View webhook delivery logs in Supabase:

```sql
SELECT 
  wl.id,
  we.url,
  wl.event_type,
  wl.response_status,
  wl.response_body,
  wl.created_at
FROM webhook_logs wl
JOIN webhook_endpoints we ON we.id = wl.webhook_id
ORDER BY wl.created_at DESC
LIMIT 20;
```

---

## Webhook Payload Format

When a testimonial is submitted, the following payload is sent to each active webhook:

```json
{
  "event": "testimonial.created",
  "timestamp": "2026-01-15T10:30:00.000Z",
  "data": {
    "id": "uuid-here",
    "space_id": "space-uuid",
    "respondent_name": "John Doe",
    "respondent_email": "john@example.com",
    "content": "Great product! Highly recommended.",
    "rating": 5,
    "type": "text",
    "created_at": "2026-01-15T10:30:00.000Z"
  }
}
```

### Headers Included

Each webhook request includes these headers:

| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `User-Agent` | `TrustFlow-Webhook/1.0` |
| `X-TrustFlow-Event` | Event type (e.g., `testimonial.created`) |
| `X-TrustFlow-Delivery` | Unique delivery ID (UUID) |
| `X-TrustFlow-Timestamp` | ISO timestamp of the event |
| `X-TrustFlow-Signature` | HMAC-SHA256 signature (if secret_key is set) |

---

## Security Features

### URL Validation
- Only HTTPS URLs are allowed
- Localhost and private IPs are blocked (SSRF prevention)
- URL format is strictly validated

### Signature Verification (Optional)
If you set a `secret_key` for your webhook, each delivery includes a signature header:

```
X-TrustFlow-Signature: sha256=<hex-encoded-hmac>
```

To verify:
```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### Timeouts & Retries
- Each webhook request has a 5-second timeout
- Failed webhooks are retried once automatically
- All attempts are logged in `webhook_logs`

---

## Troubleshooting

### Webhook Not Receiving Data

1. Check if the webhook is marked as `is_active = true`
2. Verify the event type includes `testimonial.created`
3. Check the `webhook_logs` table for error details
4. Ensure the URL is accessible from Supabase's servers

### Getting 403/401 Errors

- Your endpoint might require authentication
- Some services require specific headers
- Check if the service accepts POST requests

### Timeout Errors

- Ensure your endpoint responds within 5 seconds
- Check if your server is experiencing high load
- Consider using async/queue-based processing

---

## Integration Examples

### Zapier
1. Create a Zap with "Webhooks by Zapier" trigger
2. Choose "Catch Hook"
3. Copy the webhook URL
4. Add it in TrustFlow Settings
5. Click "Test" to send sample data
6. Continue setting up your Zap

### Slack
1. Create a Slack App (api.slack.com/apps)
2. Enable "Incoming Webhooks"
3. Create a webhook for your channel
4. Add the URL in TrustFlow
5. Format the incoming payload in your Slack workflow

### Make (formerly Integromat)
1. Create a new Scenario
2. Add "Webhooks" module → "Custom webhook"
3. Copy the webhook URL
4. Add it in TrustFlow
5. Run the scenario to capture structure

---

## Rate Limits

| Plan | Max Webhooks per Space |
|------|------------------------|
| Free | 0 (Feature disabled) |
| Pro | 5 |
| Agency | 50+ |

Limits are enforced by the `check_webhook_limit()` database trigger.
