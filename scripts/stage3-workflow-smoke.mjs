#!/usr/bin/env node
/**
 * Stage 3 authoritative workflow + Admin Updates + Stage 5 messaging smoke test.
 *
 * Usage:
 *   node scripts/stage3-workflow-smoke.mjs --confirm-stage3-smoke
 */

import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";
import { assertFixtureMutationAllowed } from "./fixture-safety.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function getDateInAsiaKolkata(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;
  return `${y}-${m}-${d}`;
}

function addDaysIso(isoDate, days) {
  const base = new Date(`${isoDate}T12:00:00+05:30`);
  base.setDate(base.getDate() + days);
  return getDateInAsiaKolkata(base);
}

function hashToken(rawToken) {
  return createHash("sha256").update(rawToken).digest("hex");
}

async function signIn(url, anonKey, email, password) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return client;
}

async function rpc(client, fn, args) {
  return client.rpc(fn, args);
}

function expectRpcError(label, error, fragment) {
  if (!error || !error.message.includes(fragment)) {
    throw new Error(
      `${label}: expected "${fragment}", got ${error?.message ?? "success"}`
    );
  }
  console.log(`PASS: ${label}`);
}

function expectRpcSuccess(label, error) {
  if (error) throw new Error(`${label}: ${error.message}`);
  console.log(`PASS: ${label}`);
}

async function findAvailableSlot(admin, bookingDate) {
  const slots = ["slot_06_09", "slot_09_12", "slot_12_15", "slot_15_18", "slot_18_21"];
  for (const slot of slots) {
    const { data } = await admin
      .from("studio_slot_occupancy")
      .select("id")
      .eq("booking_date", bookingDate)
      .eq("slot_code", slot)
      .maybeSingle();
    if (!data) return slot;
  }
  return null;
}

function parseStage5BetaEmail(credsText) {
  const line = credsText
    .split(/\r?\n/)
    .find((row) => /student.*TEST TEAM BETA/i.test(row));
  if (!line) return "makeup.student2@incluhub.test";
  const cells = line.split("|").map((cell) => cell.trim());
  return cells[3] ?? "makeup.student2@incluhub.test";
}

async function main() {
  assertFixtureMutationAllowed({
    confirmationFlag: "--confirm-stage3-smoke",
    label: "Stage 3 workflow smoke test",
  });

  const password = requireEnv("TEST_ACCOUNT_PASSWORD");
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("=== Stage 3 workflow smoke ===\n");

  const { data: portfolioRows, error: portfolioError } = await admin
    .from("portfolio_outputs")
    .select(
      "id, team_id, portfolio_type, workflow_status, leader_student_id, teams!inner(team_name, current_stage_number, status)"
    )
    .eq("portfolio_type", "photographer")
    .eq("workflow_status", "awaiting_booking")
    .eq("teams.current_stage_number", 3)
    .eq("teams.status", "active")
    .limit(1);

  if (portfolioError) throw new Error(portfolioError.message);
  if (!portfolioRows?.length) {
    throw new Error(
      "No Stage 3 photography portfolio in awaiting_booking. Run npm run test:reset -- --confirm-reset first."
    );
  }

  const portfolio = portfolioRows[0];
  const teamName = portfolio.teams.team_name;
  console.log(`Using team "${teamName}" portfolio ${portfolio.id.slice(0, 8)}…`);

  const { data: participants, error: participantsError } = await admin
    .from("portfolio_participants")
    .select("participation_role, student_id")
    .eq("portfolio_output_id", portfolio.id);

  if (participantsError) throw new Error(participantsError.message);

  const studentIds = participants.map((p) => p.student_id);
  const { data: students, error: studentsError } = await admin
    .from("students")
    .select("id, user_id")
    .in("id", studentIds);
  if (studentsError) throw new Error(studentsError.message);

  const userIds = students.map((s) => s.user_id);
  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, email")
    .in("id", userIds);
  if (profilesError) throw new Error(profilesError.message);

  const emailByStudentId = new Map(
    students.map((student) => [
      student.id,
      profiles.find((profile) => profile.id === student.user_id)?.email,
    ])
  );

  const leader = participants.find((p) => p.participation_role === "leader");
  const assistants = participants.filter((p) => p.participation_role === "assistant");
  if (!leader || assistants.length < 2) {
    throw new Error("Portfolio must have one leader and two assistants.");
  }

  const leaderEmail = emailByStudentId.get(leader.student_id);
  const assistantEmails = assistants.map((a) => emailByStudentId.get(a.student_id));
  const leaderUserId = students.find((s) => s.id === leader.student_id)?.user_id;
  if (!leaderEmail || assistantEmails.some((email) => !email) || !leaderUserId) {
    throw new Error("Could not resolve participant emails.");
  }

  let bookingDate = addDaysIso(getDateInAsiaKolkata(new Date()), 2);
  let slotCode = await findAvailableSlot(admin, bookingDate);
  for (let offset = 3; !slotCode && offset <= 10; offset += 1) {
    bookingDate = addDaysIso(getDateInAsiaKolkata(new Date()), offset);
    slotCode = await findAvailableSlot(admin, bookingDate);
  }
  if (!slotCode) throw new Error("No free studio slot found in the next 10 days.");

  const slotsPayload = [{ booking_date: bookingDate, slot_code: slotCode }];

  await admin
    .from("studio_availability_responses")
    .delete()
    .eq("portfolio_output_id", portfolio.id);

  const leaderEarly = await signIn(url, anonKey, leaderEmail, password);
  expectRpcError(
    "Leader blocked before assistants respond",
    (await rpc(leaderEarly, "book_studio_slot", {
      p_portfolio_output_id: portfolio.id,
      p_booking_date: bookingDate,
      p_slot_code: slotCode,
    })).error,
    "Both assistants must share availability"
  );
  await leaderEarly.auth.signOut();

  const assistantA = await signIn(url, anonKey, assistantEmails[0], password);
  expectRpcSuccess(
    "Assistant A shares availability",
    (
      await rpc(assistantA, "save_studio_availability", {
        p_portfolio_output_id: portfolio.id,
        p_slots: slotsPayload,
      })
    ).error
  );
  await assistantA.auth.signOut();

  const leaderMid = await signIn(url, anonKey, leaderEmail, password);
  expectRpcError(
    "Leader blocked after only one assistant",
    (await rpc(leaderMid, "book_studio_slot", {
      p_portfolio_output_id: portfolio.id,
      p_booking_date: bookingDate,
      p_slot_code: slotCode,
    })).error,
    "Both assistants must share availability"
  );
  await leaderMid.auth.signOut();

  const assistantB = await signIn(url, anonKey, assistantEmails[1], password);
  expectRpcSuccess(
    "Assistant B shares availability",
    (
      await rpc(assistantB, "save_studio_availability", {
        p_portfolio_output_id: portfolio.id,
        p_slots: slotsPayload,
      })
    ).error
  );
  await assistantB.auth.signOut();

  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count: leaderNotifyCount } = await admin
    .from("notification_recipients")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", leaderUserId)
    .gte("created_at", since);

  if ((leaderNotifyCount ?? 0) >= 1) {
    console.log("PASS: Leader received availability notification");
  } else {
    console.log("WARN: Leader notification not found in last 5 minutes (dedupe on re-run).");
  }

  const leaderClient = await signIn(url, anonKey, leaderEmail, password);
  expectRpcSuccess(
    "Leader books studio slot",
    (
      await rpc(leaderClient, "book_studio_slot", {
        p_portfolio_output_id: portfolio.id,
        p_booking_date: bookingDate,
        p_slot_code: slotCode,
      })
    ).error
  );

  const { data: bookedPortfolio } = await admin
    .from("portfolio_outputs")
    .select("workflow_status")
    .eq("id", portfolio.id)
    .single();
  if (bookedPortfolio?.workflow_status !== "awaiting_studio_checkin") {
    throw new Error(
      `Expected awaiting_studio_checkin, got ${bookedPortfolio?.workflow_status}`
    );
  }
  console.log("PASS: Portfolio moved to awaiting_studio_checkin");

  const { data: bookingRow } = await admin
    .from("studio_bookings")
    .select("id")
    .eq("portfolio_output_id", portfolio.id)
    .eq("verification_status", "online_confirmed")
    .maybeSingle();
  if (!bookingRow) throw new Error("Active online_confirmed booking not found.");

  const submitBefore = await rpc(leaderClient, "submit_portfolio", {
    p_portfolio_output_id: portfolio.id,
    p_title: "Smoke Test Portfolio",
    p_portfolio_url: "https://drive.google.com/drive/folders/smoke-test-stage3",
    p_notes: null,
  });
  if (
    !submitBefore.error ||
    (!submitBefore.error.message.includes("Physical studio check-in is required") &&
      !submitBefore.error.message.includes("This portfolio is not awaiting submission"))
  ) {
    throw new Error(
      `Submit blocked before physical check-in: ${submitBefore.error?.message ?? "unexpected success"}`
    );
  }
  console.log("PASS: Submit blocked before physical check-in");
  await leaderClient.auth.signOut();

  const { data: adminProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", "admin@incluhub.test")
    .maybeSingle();
  if (!adminProfile) throw new Error("admin@incluhub.test not found.");

  const rawToken = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  const { error: tokenInsertError } = await admin.from("studio_checkin_tokens").insert({
    booking_id: bookingRow.id,
    token_hash: hashToken(rawToken),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    generated_by: adminProfile.id,
  });
  if (tokenInsertError) throw new Error(tokenInsertError.message);
  console.log("PASS: Check-in token seeded for leader scan");

  const leaderCheckin = await signIn(url, anonKey, leaderEmail, password);
  expectRpcSuccess(
    "Leader QR check-in unlocks submission",
    (
      await rpc(leaderCheckin, "verify_studio_checkin", {
        p_qr_token: rawToken,
      })
    ).error
  );

  const { data: afterCheckin } = await admin
    .from("portfolio_outputs")
    .select("workflow_status")
    .eq("id", portfolio.id)
    .single();
  if (afterCheckin?.workflow_status !== "awaiting_submission") {
    throw new Error(
      `Expected awaiting_submission after check-in, got ${afterCheckin?.workflow_status}`
    );
  }
  console.log("PASS: Portfolio unlocked to awaiting_submission");
  await leaderCheckin.auth.signOut();

  const adminClient = await signIn(url, anonKey, "admin@incluhub.test", password);
  const updateTitle = `Stage 3 smoke ${Date.now()}`;
  const { data: notificationId, error: updateError } = await rpc(
    adminClient,
    "send_admin_update",
    {
      p_audience: "all_students",
      p_title: updateTitle,
      p_message: "Automated Stage 3 smoke test update.",
    }
  );
  expectRpcSuccess("Admin sends student Update", updateError);

  const { data: updateRow } = await admin
    .from("notifications")
    .select("event_type, audience_type")
    .eq("id", notificationId)
    .single();
  if (updateRow?.event_type !== "admin_update") {
    throw new Error(`Expected admin_update event, got ${updateRow?.event_type}`);
  }
  console.log("PASS: Admin Update stored with event_type admin_update");
  await adminClient.auth.signOut();

  const credPath = resolve(process.cwd(), "TEST_CREDENTIALS.local.md");
  const stage5Email = parseStage5BetaEmail(readFileSync(credPath, "utf8"));
  const { data: stage5Profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", stage5Email)
    .maybeSingle();

  const { data: stage5Student } = stage5Profile
    ? await admin
        .from("students")
        .select("ecosystem_access_status, current_stage_number")
        .eq("user_id", stage5Profile.id)
        .maybeSingle()
    : { data: null };

  if (!stage5Student || (stage5Student.current_stage_number ?? 0) < 5) {
    console.log(`WARN: ${stage5Email} is not Stage 5 — under-review check skipped.`);
  } else if (stage5Student.ecosystem_access_status === "granted") {
    console.log(`WARN: ${stage5Email} already granted — under-review check skipped.`);
  } else {
    console.log(
      `PASS: Stage 5 student ${stage5Email} is ${stage5Student.ecosystem_access_status} (not granted)`
    );
  }

  console.log("\n=== Stage 3 smoke complete ===");
  console.log(`Team: ${teamName}`);
  console.log(`Booking: ${bookingDate} ${slotCode}`);
  console.log("\nOptional UI checks at http://localhost:3000");
  console.log(`  Leader portfolio: sign in as ${leaderEmail}`);
  console.log("  Admin Updates: admin@incluhub.test → /admin/notifications");
  console.log(`  Stage 5 review: ${stage5Email} → /student/dashboard`);
}

main().catch((error) => {
  console.error("\nFAIL:", error.message);
  process.exit(1);
});
