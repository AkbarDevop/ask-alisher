import { createHash } from "node:crypto";
import { getSupabase } from "@/lib/supabase";

const RATE_LIMIT_RPC = "consume_ask_alisher_rate_limit";
const fallbackRateMap = new Map<string, { count: number; resetAt: number }>();

function buildRateLimitKey(ip: string): string {
  return createHash("sha256").update(`ask-alisher:${ip}`).digest("hex");
}

function consumeFallbackRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): { allowed: boolean; requestCount: number; resetAt: string; durable: boolean } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const entry = fallbackRateMap.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    fallbackRateMap.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      requestCount: 1,
      resetAt: new Date(resetAt).toISOString(),
      durable: false,
    };
  }

  entry.count += 1;
  return {
    allowed: entry.count <= limit,
    requestCount: entry.count,
    resetAt: new Date(entry.resetAt).toISOString(),
    durable: false,
  };
}

export async function consumeAskAlisherRateLimit(
  ip: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; requestCount: number; resetAt: string; durable: boolean }> {
  const key = buildRateLimitKey(ip || "unknown");

  try {
    const { data, error } = await getSupabase().rpc(RATE_LIMIT_RPC, {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      throw new Error("Rate limit RPC returned no data");
    }

    return {
      allowed: Boolean(row.allowed),
      requestCount: Number(row.request_count) || 0,
      resetAt: typeof row.reset_at === "string" ? row.reset_at : new Date().toISOString(),
      durable: true,
    };
  } catch (error) {
    console.error("Durable rate limit failed, falling back to in-memory limiter:", error);
    return consumeFallbackRateLimit(key, limit, windowSeconds);
  }
}
