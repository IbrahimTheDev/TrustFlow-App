// Supabase Edge Function: process-webhooks
// Triggered by Database Webhook when a new testimonial is created
// Dispatches webhook notifications to all active endpoints for the space

// @ts-ignore - Deno imports
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore - Deno imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

// Type definitions
interface Testimonial {
  id: string;
  space_id: string;
  respondent_name: string | null;
  respondent_email: string | null;
  content: string | null;
  rating: number | null;
  type: string;
  created_at: string;
}

interface WebhookEndpoint {
  id: string;
  space_id: string;
  url: string;
  description: string | null;
  is_active: boolean;
  secret_key: string | null;
  event_types: string[];
}

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: {
    id: string;
    space_id: string;
    respondent_name: string;
    respondent_email: string;
    content: string;
    rating: number | null;
    type: string;
    created_at: string;
  };
}

// Platform-specific payload types
interface SlackPayload {
  text: string;
  blocks?: Array<{
    type: string;
    text?: { type: string; text: string; emoji?: boolean };
    fields?: Array<{ type: string; text: string }>;
    accessory?: { type: string; text: { type: string; text: string; emoji: boolean }; url: string };
  }>;
}

interface DiscordPayload {
  content: string;
  embeds?: Array<{
    title: string;
    description: string;
    color: number;
    fields: Array<{ name: string; value: string; inline?: boolean }>;
    timestamp: string;
  }>;
}

/**
 * Detect platform from webhook URL
 */
function detectPlatform(url: string): 'slack' | 'discord' | 'generic' {
  if (!url) return 'generic';
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('hooks.slack.com')) return 'slack';
  if (lowerUrl.includes('discord.com/api/webhooks') || lowerUrl.includes('discordapp.com/api/webhooks')) return 'discord';
  return 'generic';
}

/**
 * Generate star rating string
 */
function generateStars(rating: number | null): string {
  if (!rating || rating < 1) return '☆☆☆☆☆';
  const fullStars = Math.min(Math.floor(rating), 5);
  return '⭐'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
}

/**
 * Format payload for Slack using Block Kit
 */
function formatSlackPayload(payload: WebhookPayload): SlackPayload {
  const { data } = payload;
  const stars = generateStars(data.rating);
  const contentPreview = data.content?.substring(0, 200) || 'No content provided';
  
  return {
    text: `🎉 New Testimonial from ${data.respondent_name}!\nRating: ${stars}\n"${contentPreview}${data.content && data.content.length > 200 ? '...' : ''}"`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🎉 New Testimonial Received!",
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*From:*\n${data.respondent_name}`
          },
          {
            type: "mrkdwn",
            text: `*Rating:*\n${stars}`
          }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Testimonial:*\n> _"${contentPreview}${data.content && data.content.length > 200 ? '...' : ''}"_`
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Type:*\n${data.type || 'text'}`
          },
          {
            type: "mrkdwn",
            text: `*Received:*\n<!date^${Math.floor(new Date(data.created_at).getTime() / 1000)}^{date_short_pretty} at {time}|${data.created_at}>`
          }
        ]
      }
    ]
  };
}

/**
 * Format payload for Discord using Embeds
 */
function formatDiscordPayload(payload: WebhookPayload): DiscordPayload {
  const { data } = payload;
  const stars = generateStars(data.rating);
  const contentPreview = data.content?.substring(0, 300) || 'No content provided';
  
  return {
    content: "🎉 **New Testimonial Received!**",
    embeds: [{
      title: `Testimonial from ${data.respondent_name}`,
      description: `> _"${contentPreview}${data.content && data.content.length > 300 ? '...' : ''}"_`,
      color: 0x8B5CF6, // Violet color
      fields: [
        {
          name: "⭐ Rating",
          value: stars,
          inline: true
        },
        {
          name: "📝 Type",
          value: data.type || 'text',
          inline: true
        },
        {
          name: "📧 Email",
          value: data.respondent_email || 'Not provided',
          inline: true
        }
      ],
      timestamp: data.created_at
    }]
  };
}

interface DatabaseWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Testimonial;
  schema: string;
  old_record: Testimonial | null;
}

interface WebhookResult {
  success: boolean;
  status: number | null;
  error: string | null;
}

type PromiseSettledResultWithValue = PromiseSettledResult<WebhookResult>;

// CORS headers for preflight requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Timeout for individual webhook requests (5 seconds)
const WEBHOOK_TIMEOUT_MS = 5000;

// Maximum retries for failed webhooks
const MAX_RETRIES = 1;

/**
 * Generate HMAC signature for webhook payload verification
 */
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(payload);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
  const signatureArray = Array.from(new Uint8Array(signature));
  return signatureArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Send webhook with timeout and retry logic
 */
async function sendWebhook(
  webhook: WebhookEndpoint,
  payload: WebhookPayload,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  attemptNumber: number = 1
): Promise<WebhookResult> {
  // Detect platform and format payload accordingly
  const platform = detectPlatform(webhook.url);
  let finalPayload: WebhookPayload | SlackPayload | DiscordPayload;
  
  switch (platform) {
    case 'slack':
      finalPayload = formatSlackPayload(payload);
      break;
    case 'discord':
      finalPayload = formatDiscordPayload(payload);
      break;
    default:
      finalPayload = payload;
  }
  
  const payloadString = JSON.stringify(finalPayload);
  
  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "TrustFlow-Webhook/1.0",
    "X-TrustFlow-Event": payload.event,
    "X-TrustFlow-Delivery": crypto.randomUUID(),
    "X-TrustFlow-Timestamp": payload.timestamp,
    "X-TrustFlow-Platform": platform,
  };

  // Add signature header if secret exists
  if (webhook.secret_key) {
    const signature = await generateSignature(payloadString, webhook.secret_key);
    headers["X-TrustFlow-Signature"] = `sha256=${signature}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let success = false;

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: payloadString,
      signal: controller.signal,
    });

    responseStatus = response.status;
    responseBody = await response.text().catch(() => null);
    
    // Consider 2xx status codes as success
    success = response.status >= 200 && response.status < 300;

    clearTimeout(timeoutId);

  } catch (err: unknown) {
    clearTimeout(timeoutId);
    
    const error = err as Error;
    if (error.name === "AbortError") {
      responseBody = "Request timed out after 5 seconds";
      responseStatus = 408; // Request Timeout
    } else {
      responseBody = error.message || "Unknown error occurred";
      responseStatus = 500;
    }
    success = false;
  }

  // Log the webhook attempt
  try {
    await supabase.from("webhook_logs").insert({
      webhook_id: webhook.id,
      event_type: payload.event,
      payload: payload as unknown as Record<string, unknown>,
      response_status: responseStatus,
      response_body: responseBody?.substring(0, 1000), // Limit body size
      attempt_number: attemptNumber,
    });
  } catch (logError) {
    console.error("Failed to log webhook attempt:", logError);
  }

  // Retry logic for failed webhooks
  if (!success && attemptNumber < MAX_RETRIES) {
    console.log(`Webhook failed, retrying... (attempt ${attemptNumber + 1})`);
    // Wait 1 second before retry
    await new Promise(resolve => setTimeout(resolve, 1000));
    return sendWebhook(webhook, payload, supabase, attemptNumber + 1);
  }

  return {
    success,
    status: responseStatus,
    error: success ? null : responseBody,
  };
}

// Declare Deno for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

/**
 * Main handler for the Edge Function
 */
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Parse the incoming webhook payload from Supabase Database Webhook
    const webhookPayload: DatabaseWebhookPayload = await req.json();
    
    console.log("Received database webhook:", {
      type: webhookPayload.type,
      table: webhookPayload.table,
      recordId: webhookPayload.record?.id,
    });

    // Only process INSERT events for testimonials
    if (webhookPayload.type !== "INSERT" || webhookPayload.table !== "testimonials") {
      return new Response(
        JSON.stringify({ message: "Event ignored - not a new testimonial" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const testimonial = webhookPayload.record;
    
    if (!testimonial || !testimonial.space_id) {
      return new Response(
        JSON.stringify({ error: "Invalid testimonial data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all active webhooks for this space
    const { data: webhooks, error: webhooksError } = await supabase
      .from("webhook_endpoints")
      .select("*")
      .eq("space_id", testimonial.space_id)
      .eq("is_active", true)
      .contains("event_types", ["testimonial.created"]);

    if (webhooksError) {
      console.error("Failed to fetch webhooks:", webhooksError);
      throw webhooksError;
    }

    if (!webhooks || webhooks.length === 0) {
      console.log("No active webhooks found for space:", testimonial.space_id);
      return new Response(
        JSON.stringify({ message: "No active webhooks configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${webhooks.length} webhook(s) for space:`, testimonial.space_id);

    // Build the webhook payload
    const payload: WebhookPayload = {
      event: "testimonial.created",
      timestamp: new Date().toISOString(),
      data: {
        id: testimonial.id,
        space_id: testimonial.space_id,
        respondent_name: testimonial.respondent_name || "Anonymous",
        respondent_email: testimonial.respondent_email || "",
        content: testimonial.content || "",
        rating: testimonial.rating,
        type: testimonial.type,
        created_at: testimonial.created_at,
      },
    };

    // Send webhooks in parallel with individual error handling
    const results = await Promise.allSettled(
      webhooks.map((webhook: WebhookEndpoint) => sendWebhook(webhook, payload, supabase))
    );

    // Summarize results
    const summary = {
      total: webhooks.length,
      success: results.filter(
        (r: PromiseSettledResultWithValue) => r.status === "fulfilled" && r.value.success
      ).length,
      failed: results.filter(
        (r: PromiseSettledResultWithValue) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)
      ).length,
      details: results.map((r: PromiseSettledResultWithValue, i: number) => ({
        webhook_id: webhooks[i].id,
        url: webhooks[i].url.substring(0, 50) + "...",
        status: r.status === "fulfilled" ? r.value.status : "error",
        success: r.status === "fulfilled" ? r.value.success : false,
      })),
    };

    console.log("Webhook dispatch complete:", summary);

    return new Response(JSON.stringify({ message: "Webhooks processed", summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const error = err as Error;
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
