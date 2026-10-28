import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { taskReminderAtUtc } from "./schedule.ts";

const PAGE_SIZE = 500;
const MAX_RETRIES = 3;
const PROCESSING_LEASE_MS = 5 * 60_000;
const LOOKBACK_MS = 5 * 60_000;
const SITE_URL = "https://johanxinho.github.io/PRYECTO-PPI/";
const ALLOWED_ORIGINS = new Set([
  "https://johanxinho.github.io",
  "http://localhost:5173",
]);

function jsonResponse(body: unknown, status: number, origin?: string | null): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "content-type, x-push-scheduler-secret");
    headers.set("Access-Control-Max-Age", "600");
  }
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

async function constantTimeEquals(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) mismatch |= a[index] ^ b[index];
  return mismatch === 0;
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

async function listAllRows(buildQuery: () => any): Promise<any[]> {
  const rows: any[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error("DATABASE_QUERY_FAILED");
    const page = data || [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

function trustedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();
    const allowedHost = host === "fcm.googleapis.com"
      || host === "webpush.apple.com"
      || host.endsWith(".push.apple.com")
      || host === "updates.push.services.mozilla.com"
      || host.endsWith(".push.services.mozilla.com")
      || host.endsWith(".notify.windows.com");
    return url.protocol === "https:"
      && url.port === ""
      && !url.username
      && !url.password
      && allowedHost;
  } catch {
    return false;
  }
}

function deliveryKey(subscriptionId: string, taskId: string, scheduledFor: string): string {
  return `${subscriptionId}|${taskId}|${new Date(scheduledFor).toISOString()}`;
}

async function updateDelivery(
  db: any,
  id: string,
  status: "sent" | "failed" | "gone",
  lastError: string | null,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await db.from("push_delivery_log").update({
    status,
    last_error: lastError,
    updated_at: now,
    ...(status === "sent" ? { delivered_at: now } : {}),
  }).eq("id", id);
  if (error) throw new Error("DELIVERY_STATE_UPDATE_FAILED");
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return jsonResponse({ error: "origin_not_allowed" }, 403);
  if (request.method === "OPTIONS") return jsonResponse({ ok: true }, 204, origin);
  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, origin);

  const schedulerSecret = Deno.env.get("PUSH_SCHEDULER_SECRET");
  if (!schedulerSecret) return jsonResponse({ error: "push_not_configured" }, 503, origin);
  const suppliedSecret = request.headers.get("x-push-scheduler-secret") || "";
  if (!(await constantTimeEquals(suppliedSecret, schedulerSecret))) {
    return jsonResponse({ error: "unauthorized" }, 401, origin);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 4096) return jsonResponse({ error: "payload_too_large" }, 413, origin);
  const requestBody = await request.json().catch(() => ({}));
  const dryRun = requestBody?.dry_run === true;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || SITE_URL;
  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return jsonResponse({ error: "push_not_configured" }, 503, origin);
  }

  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const now = new Date();
    const nowIso = now.toISOString();
    const earliestSchedule = new Date(now.getTime() - LOOKBACK_MS).toISOString();
    const earliestDate = new Date(now.getTime() - 26 * 60 * 60_000).toISOString().slice(0, 10);
    const latestDate = new Date(now.getTime() + 26 * 60 * 60_000).toISOString().slice(0, 10);

    const subscriptions = await listAllRows(() => db
      .from("push_subscriptions")
      .select("id,user_id,endpoint,p256dh,auth")
      .order("created_at", { ascending: true }));
    if (!subscriptions.length) return jsonResponse({ sent: 0, failed: 0, expired: 0, skipped: 0 }, 200, origin);

    const userIds = [...new Set(subscriptions.map((row) => row.user_id).filter(Boolean))];
    const profiles: any[] = [];
    for (const batch of chunks(userIds, 100)) {
      const { data, error } = await db.from("profiles")
        .select("id,is_active,status,disabled_at,reminders_enabled,browser_notifications_enabled")
        .in("id", batch);
      if (error) throw new Error("PROFILE_QUERY_FAILED");
      profiles.push(...(data || []));
    }
    const activeProfiles = new Map(profiles
      .filter((profile) => profile.is_active === true
        && (profile.status ?? "activo") === "activo"
        && !profile.disabled_at
        && profile.reminders_enabled !== false
        && profile.browser_notifications_enabled === true)
      .map((profile) => [profile.id, profile]));
    const activeUserIds = [...activeProfiles.keys()];
    if (!activeUserIds.length) return jsonResponse({ sent: 0, failed: 0, expired: 0, skipped: subscriptions.length }, 200, origin);

    const tasks: any[] = [];
    for (const batch of chunks(activeUserIds, 100)) {
      const rows = await listAllRows(() => db.from("tasks")
        .select("id,user_id,title,subject,date,time,reminder,time_zone,completed")
        .in("user_id", batch)
        .eq("completed", false)
        .not("reminder", "is", null)
        .gte("date", earliestDate)
        .lte("date", latestDate)
        .order("date", { ascending: true })
        .order("time", { ascending: true }));
      tasks.push(...rows);
    }

    const subscriptionsByUser = new Map<string, any[]>();
    const subscriptionById = new Map<string, any>();
    for (const subscription of subscriptions) {
      if (!activeProfiles.has(subscription.user_id)) continue;
      const userSubscriptions = subscriptionsByUser.get(subscription.user_id) || [];
      userSubscriptions.push(subscription);
      subscriptionsByUser.set(subscription.user_id, userSubscriptions);
      subscriptionById.set(subscription.id, subscription);
    }

    const candidates: any[] = [];
    let skipped = 0;
    for (const task of tasks) {
      const scheduledAt = taskReminderAtUtc(task);
      if (!scheduledAt || scheduledAt.getTime() < now.getTime() - LOOKBACK_MS || scheduledAt.getTime() > now.getTime()) continue;
      for (const subscription of subscriptionsByUser.get(task.user_id) || []) {
        if (!trustedPushEndpoint(subscription.endpoint)) {
          skipped += 1;
          continue;
        }
        candidates.push({ task, subscription, scheduledAt, scheduledFor: scheduledAt.toISOString() });
      }
    }
    if (dryRun) {
      return jsonResponse({ dry_run: true, candidates: candidates.length, tasks: new Set(candidates.map((candidate) => candidate.task.id)).size, skipped }, 200, origin);
    }
    if (!candidates.length) return jsonResponse({ sent: 0, failed: 0, expired: 0, skipped }, 200, origin);

    const taskIds = [...new Set(candidates.map((candidate) => candidate.task.id))];
    const existingLogs: any[] = [];
    for (const batch of chunks(taskIds, 100)) {
      const rows = await listAllRows(() => db.from("push_delivery_log")
        .select("id,task_id,subscription_id,scheduled_for,status,attempts,updated_at")
        .in("task_id", batch)
        .gte("scheduled_for", earliestSchedule)
        .lte("scheduled_for", nowIso));
      existingLogs.push(...rows);
    }
    const existingByKey = new Map(existingLogs.map((row) => [
      deliveryKey(row.subscription_id, row.task_id, row.scheduled_for),
      row,
    ]));

    const newClaims: any[] = [];
    const retryClaims: any[] = [];
    let skippedClaims = 0;
    for (const candidate of candidates) {
      const key = deliveryKey(candidate.subscription.id, candidate.task.id, candidate.scheduledFor);
      const previous = existingByKey.get(key);
      if (!previous) {
        newClaims.push({
          user_id: candidate.task.user_id,
          task_id: candidate.task.id,
          subscription_id: candidate.subscription.id,
          scheduled_for: candidate.scheduledFor,
          status: "processing",
          attempts: 1,
          last_error: null,
          updated_at: nowIso,
        });
        continue;
      }
      if (previous.status === "sent" || previous.status === "gone") {
        skippedClaims += 1;
        continue;
      }
      if (previous?.status === "processing"
        && now.getTime() - new Date(previous.updated_at).getTime() < PROCESSING_LEASE_MS) {
        skippedClaims += 1;
        continue;
      }
      if (previous.status !== "failed" && previous.status !== "processing") {
        skippedClaims += 1;
        continue;
      }
      if (Number(previous.attempts) >= MAX_RETRIES) {
        skippedClaims += 1;
        continue;
      }
      let retryQuery = db.from("push_delivery_log").update({
        status: "processing",
        attempts: Number(previous.attempts) + 1,
        last_error: null,
        updated_at: nowIso,
      }).eq("id", previous.id).eq("status", previous.status).lt("attempts", MAX_RETRIES);
      if (previous.status === "processing") {
        retryQuery = retryQuery.lte("updated_at", new Date(now.getTime() - PROCESSING_LEASE_MS).toISOString());
      }
      const { data: retryRow, error: retryError } = await retryQuery
        .select("id,user_id,task_id,subscription_id,scheduled_for,attempts")
        .maybeSingle();
      if (retryError) throw new Error("DELIVERY_RETRY_CLAIM_FAILED");
      if (retryRow) retryClaims.push(retryRow);
      else skippedClaims += 1;
    }

    let claimedRows = retryClaims;
    if (newClaims.length) {
      const { data: insertedRows, error: claimError } = await db.from("push_delivery_log")
        .upsert(newClaims, { onConflict: "subscription_id,task_id,scheduled_for", ignoreDuplicates: true })
        .select("id,user_id,task_id,subscription_id,scheduled_for,attempts");
      if (claimError) throw new Error("DELIVERY_CLAIM_FAILED");
      claimedRows = [...claimedRows, ...(insertedRows || [])];
      skippedClaims += newClaims.length - (insertedRows || []).length;
    }
    if (!claimedRows.length) {
      return jsonResponse({ sent: 0, failed: 0, expired: 0, skipped: skipped + skippedClaims }, 200, origin);
    }

    const taskById = new Map(tasks.map((task) => [task.id, task]));
    let sent = 0;
    let failed = 0;
    let expired = 0;
    const claimed = claimedRows;
    for (const batch of chunks(claimed, 10)) {
      await Promise.all(batch.map(async (delivery) => {
        const task = taskById.get(delivery.task_id);
        const subscription = subscriptionById.get(delivery.subscription_id);
        if (!task || !subscription || !trustedPushEndpoint(subscription.endpoint)) {
          await updateDelivery(db, delivery.id, "failed", "INVALID_DELIVERY_TARGET");
          failed += 1;
          return;
        }
        const payload = JSON.stringify({
          title: `Recordatorio: ${task.title}`,
          body: `${task.subject} · ${task.title}`,
          taskId: task.id,
          tag: `recordate-task-${task.id}`,
          url: new URL("tareas", SITE_URL).href,
          requireInteraction: true,
        });
        try {
          await webpush.sendNotification({
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          }, payload, { TTL: 300, urgency: "high" });
          await updateDelivery(db, delivery.id, "sent", null);
          sent += 1;
        } catch (error) {
          const statusCode = Number((error as { statusCode?: number })?.statusCode || 0);
          if (statusCode === 404 || statusCode === 410) {
            await db.from("push_subscriptions").delete().eq("id", subscription.id);
            await updateDelivery(db, delivery.id, "gone", "EXPIRED_ENDPOINT");
            expired += 1;
          } else {
            await updateDelivery(db, delivery.id, "failed", statusCode ? `HTTP_${statusCode}` : "SEND_FAILED");
            failed += 1;
          }
        }
      }));
    }
    return jsonResponse({ sent, failed, expired, skipped: skipped + skippedClaims }, 200, origin);
  } catch (error) {
    const safeCode = error instanceof Error ? error.message : "UNEXPECTED_ERROR";
    console.error("recordate_push_scheduler_failed", safeCode);
    return jsonResponse({ error: "push_scheduler_failed" }, 500, origin);
  }
});
