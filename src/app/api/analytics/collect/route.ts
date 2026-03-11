import { createClient } from "@supabase/supabase-js";
import {
  ASK_ALISHER_ANALYTICS_EVENTS,
  ASK_ALISHER_ANALYTICS_TABLE,
} from "@/lib/analytics";

export const maxDuration = 10;

const ALLOWED_EVENTS = new Set<string>(ASK_ALISHER_ANALYTICS_EVENTS);

function getSupabaseServiceRoleClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, supabaseKey);
}

function sanitizePrimitive(value: unknown): string | number | boolean | null {
  if (typeof value === "string") {
    return value.slice(0, 240);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "boolean") {
    return value;
  }
  return null;
}

function sanitizePayload(input: unknown): Record<string, string | number | boolean | null> {
  if (!input || typeof input !== "object") {
    return {};
  }

  const entries = Object.entries(input as Record<string, unknown>).slice(0, 32);
  return Object.fromEntries(entries.map(([key, value]) => [key.slice(0, 64), sanitizePrimitive(value)]));
}

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const event = typeof (body as { event?: unknown }).event === "string"
    ? (body as { event: string }).event
    : "";

  if (!ALLOWED_EVENTS.has(event)) {
    return new Response(null, { status: 204 });
  }

  const sessionId = typeof (body as { sessionId?: unknown }).sessionId === "string"
    ? (body as { sessionId: string }).sessionId.slice(0, 80)
    : "unknown";
  const payload = sanitizePayload((body as { payload?: unknown }).payload);

  try {
    const supabase = getSupabaseServiceRoleClient();
    const { error } = await supabase.from(ASK_ALISHER_ANALYTICS_TABLE).insert({
      event_name: event,
      session_id: sessionId,
      language: typeof payload.language === "string" ? payload.language : null,
      hostname: typeof payload.analytics_hostname === "string" ? payload.analytics_hostname : null,
      page_path: typeof payload.page_path === "string" ? payload.page_path : null,
      metadata: payload,
    });

    if (error) {
      console.error("Analytics insert failed:", error.message);
    }
  } catch (error) {
    console.error("Analytics collection failed:", error);
  }

  return new Response(null, { status: 204 });
}
