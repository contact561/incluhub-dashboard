#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.TEST_ACCOUNT_PASSWORD;
const resume = process.argv.includes("--resume");
const continueAfterMoodboardError = process.argv.includes(
  "--continue-after-moodboard-error"
);

for (const [name, value] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  TEST_ACCOUNT_PASSWORD: password,
})) {
  if (!value) throw new Error(`Missing ${name}`);
}

const service = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const emails = {
  admin: "admin@incluhub.test",
  photoEducator: "photo.educator@incluhub.test",
  makeupEducator: "makeup.educator@incluhub.test",
  hairEducator: "hair.educator@incluhub.test",
  photo: "photo.student1@incluhub.test",
  makeup: "makeup.student1@incluhub.test",
  hair: "hair.student1@incluhub.test",
};

const report = {
  startedAt: new Date().toISOString(),
  checkpoints: [],
  expectedGuards: [],
  attendanceBypass: [],
  issues: [],
};

function checkpoint(name, detail = "") {
  report.checkpoints.push({ name, detail, at: new Date().toISOString() });
  console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function authClient() {
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function signIn(email) {
  const client = authClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
  return client;
}

async function rpc(client, fn, args) {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data;
}

async function expectRpcError(client, fn, args, expected) {
  const { error } = await client.rpc(fn, args);
  assert(error, `${fn} unexpectedly succeeded`);
  assert(
    error.message.includes(expected),
    `${fn} returned unexpected error: ${error.message}`
  );
  report.expectedGuards.push({ fn, expected, actual: error.message });
  checkpoint(`${fn} security guard`, expected);
}

function dateInKolkata(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function getRows(table, columns, filters = []) {
  let query = service.from(table).select(columns);
  for (const [column, value] of filters) query = query.eq(column, value);
  const { data, error } = await query;
  if (error) throw new Error(`${table} query: ${error.message}`);
  return data ?? [];
}

async function setPhysicalAttendance(portfolioId, leaderUserId) {
  const { data: booking, error: lookupError } = await service
    .from("studio_bookings")
    .select("id")
    .eq("portfolio_output_id", portfolioId)
    .single();
  if (lookupError) throw new Error(`Booking lookup: ${lookupError.message}`);

  const verifiedAt = new Date().toISOString();
  const { error: bookingError } = await service
    .from("studio_bookings")
    .update({
      verification_status: "physically_verified",
      physically_verified_at: verifiedAt,
      physically_verified_by: leaderUserId,
    })
    .eq("id", booking.id);
  if (bookingError) throw new Error(`Attendance setup: ${bookingError.message}`);

  const { error: portfolioError } = await service
    .from("portfolio_outputs")
    .update({ workflow_status: "awaiting_submission" })
    .eq("id", portfolioId)
    .eq("workflow_status", "awaiting_studio_checkin");
  if (portfolioError) {
    throw new Error(`Submission unlock setup: ${portfolioError.message}`);
  }

  report.attendanceBypass.push({
    bookingId: booking.id,
    portfolioId,
    reason:
      "OTP generation is restricted to the live slot window; the lifecycle test ran outside all studio windows.",
  });
  return booking.id;
}

async function main() {
  const profiles = await getRows("profiles", "id,email,role,status");
  const byEmail = new Map(profiles.map((profile) => [profile.email, profile]));
  for (const email of Object.values(emails)) {
    assert(byEmail.has(email), `Required fresh account missing: ${email}`);
  }
  checkpoint("Stage 0 fresh accounts", "Admin, 3 educators, and team students exist");

  const students = await getRows(
    "students",
    "id,user_id,institute_id,student_category,current_stage_number,current_team_id,ecosystem_access_status"
  );
  const educators = await getRows(
    "educators",
    "id,user_id,institute_id,educator_type"
  );
  const studentByUser = new Map(students.map((student) => [student.user_id, student]));
  const educatorByUser = new Map(
    educators.map((educator) => [educator.user_id, educator])
  );

  const teamStudents = {
    photo: studentByUser.get(byEmail.get(emails.photo).id),
    makeup: studentByUser.get(byEmail.get(emails.makeup).id),
    hair: studentByUser.get(byEmail.get(emails.hair).id),
  };
  const teamEducators = {
    photo: educatorByUser.get(byEmail.get(emails.photoEducator).id),
    makeup: educatorByUser.get(byEmail.get(emails.makeupEducator).id),
    hair: educatorByUser.get(byEmail.get(emails.hairEducator).id),
  };
  const admin = await signIn(emails.admin);
  let programId;
  let teamId;
  let stageRows;

  if (resume) {
    const [program] = await getRows("programs", "id", [
      ["name", "FULL LIFECYCLE AUDIT PROGRAM"],
    ]);
    const [team] = await getRows("teams", "id,current_stage_number", [
      ["team_name", "FULL LIFECYCLE AUDIT TEAM"],
    ]);
    assert(program && team, "Disposable lifecycle state was not found");
    programId = program.id;
    teamId = team.id;
    checkpoint(
      "Resume disposable lifecycle",
      `Continuing from Stage ${team.current_stage_number}`
    );
  } else {
    assert(
      Object.values(teamStudents).every(
        (student) =>
          student &&
          student.current_stage_number === 0 &&
          student.current_team_id === null
      ),
      "Selected students are not fresh Stage 0 accounts"
    );

    programId = await rpc(admin, "create_program_with_institutes", {
      p_name: "FULL LIFECYCLE AUDIT PROGRAM",
      p_description: "Disposable Stage 0 to Stage 5 lifecycle audit",
      p_start_date: null,
      p_end_date: null,
      p_status: "active",
      p_institute_ids: [
        teamStudents.photo.institute_id,
        teamStudents.makeup.institute_id,
        teamStudents.hair.institute_id,
      ],
    });

    const { error: enrollmentError } = await service
      .from("program_enrollments")
      .insert(
        Object.values(teamStudents).map((student) => ({
          program_id: programId,
          student_id: student.id,
          status: "active",
          created_by: byEmail.get(emails.admin).id,
        }))
      );
    if (enrollmentError) {
      throw new Error(`Program enrollment: ${enrollmentError.message}`);
    }

    teamId = await rpc(admin, "create_balanced_team", {
      p_team_name: "FULL LIFECYCLE AUDIT TEAM",
      p_program_id: programId,
      p_makeup_artist_student_id: teamStudents.makeup.id,
      p_photographer_student_id: teamStudents.photo.id,
      p_hairstylist_student_id: teamStudents.hair.id,
      p_makeup_educator_id: teamEducators.makeup.id,
      p_photography_educator_id: teamEducators.photo.id,
      p_hairstyling_educator_id: teamEducators.hair.id,
    });
    await rpc(admin, "start_team_stage_journey", { p_team_id: teamId });

    stageRows = await getRows(
      "team_stage_progress",
      "stage_number,status,admin_approval_status",
      [["team_id", teamId]]
    );
    const stageStatus = new Map(
      stageRows.map((stage) => [stage.stage_number, stage.status])
    );
    assert(stageStatus.get(0) === "completed", "Stage 0 was not completed");
    assert(stageStatus.get(1) === "completed", "Stage 1 was not completed");
    assert(stageStatus.get(2) === "in_progress", "Stage 2 did not open");
    checkpoint("Stages 0 and 1", "Team created; Stage 2 opened");

    await rpc(admin, "complete_bms_session", {
      p_team_id: teamId,
      p_session_date: dateInKolkata(),
      p_remarks: "Full lifecycle audit BMS",
    });
    checkpoint("Stage 2 BMS", "Completed and Stage 3 opened");
  }

  const portfolioSpecs = [
    {
      sequence: 1,
      leader: "photo",
      educator: "photoEducator",
      assistants: ["makeup", "hair"],
      slot: "slot_09_12",
      label: "Photography",
    },
    {
      sequence: 2,
      leader: "makeup",
      educator: "makeupEducator",
      assistants: ["photo", "hair"],
      slot: "slot_12_15",
      label: "Makeup",
    },
    {
      sequence: 3,
      leader: "hair",
      educator: "hairEducator",
      assistants: ["photo", "makeup"],
      slot: "slot_15_18",
      label: "Hairstyling",
    },
  ];

  for (const spec of portfolioSpecs) {
    const [portfolio] = await getRows(
      "portfolio_outputs",
      "id,workflow_status,moodboard_status,leader_student_id,sequence_order",
      [
        ["team_id", teamId],
        ["sequence_order", spec.sequence],
      ]
    );
    assert(portfolio, `${spec.label} portfolio was not created`);
    assert(
      portfolio.workflow_status === "awaiting_booking",
      `${spec.label} portfolio did not unlock sequentially`
    );

    const leaderEmail = emails[spec.leader];
    const leader = await signIn(leaderEmail);
    let moodboard;
    if (portfolio.moodboard_status === "pending_admin") {
      const existingMoodboards = await getRows(
        "moodboard_submissions",
        "id,version_number",
        [["portfolio_output_id", portfolio.id]]
      );
      moodboard = {
        moodboard_submission_id: existingMoodboards.sort(
          (left, right) => right.version_number - left.version_number
        )[0]?.id,
      };
      assert(
        moodboard.moodboard_submission_id,
        "Pending moodboard submission was not found"
      );
    } else {
      const moodboardResult = await rpc(leader, "submit_moodboard", {
        p_portfolio_output_id: portfolio.id,
        p_title: `${spec.label} audit moodboard`,
        p_moodboard_url: `https://drive.google.com/${spec.label.toLowerCase()}-moodboard`,
        p_notes: "Lifecycle audit moodboard",
      });
      moodboard = Array.isArray(moodboardResult)
        ? moodboardResult[0]
        : moodboardResult;
    }

    const educator = await signIn(emails[spec.educator]);
    const existingMoodboardComments = await getRows(
      "workflow_comments",
      "id",
      [["moodboard_submission_id", moodboard.moodboard_submission_id]]
    );
    if (existingMoodboardComments.length === 0) {
      await rpc(educator, "add_educator_workflow_comment", {
        p_team_id: teamId,
        p_portfolio_output_id: portfolio.id,
        p_moodboard_submission_id: moodboard.moodboard_submission_id,
        p_portfolio_submission_id: null,
        p_body: `${spec.label} educator moodboard monitoring note`,
      });
    }

    const moodboardReviewResult = await admin.rpc("review_moodboard_as_admin", {
      p_moodboard_submission_id: moodboard.moodboard_submission_id,
      p_decision: "approved",
      p_comments: `${spec.label} moodboard approved in lifecycle audit`,
    });
    if (moodboardReviewResult.error) {
      report.issues.push({
        stage: "Stage 3 moodboard review",
        operation: "review_moodboard_as_admin",
        error: moodboardReviewResult.error.message,
      });
      if (!continueAfterMoodboardError) {
        throw new Error(
          `Admin moodboard approval failed: ${moodboardReviewResult.error.message}`
        );
      }
      const { error: reviewInsertError } = await service
        .from("moodboard_reviews")
        .insert({
          moodboard_submission_id: moodboard.moodboard_submission_id,
          reviewer_user_id: byEmail.get(emails.admin).id,
          decision: "approved",
          comments: `${spec.label} test-only approval bypass`,
          created_by: byEmail.get(emails.admin).id,
        });
      if (reviewInsertError) {
        throw new Error(`Moodboard approval bypass: ${reviewInsertError.message}`);
      }
      const { error: moodboardUpdateError } = await service
        .from("portfolio_outputs")
        .update({ moodboard_status: "approved" })
        .eq("id", portfolio.id);
      if (moodboardUpdateError) {
        throw new Error(`Moodboard status bypass: ${moodboardUpdateError.message}`);
      }
      checkpoint(`${spec.label} known moodboard defect bypassed`);
    }

    for (const assistantKey of spec.assistants) {
      const assistant = await signIn(emails[assistantKey]);
      await rpc(assistant, "save_studio_availability", {
        p_portfolio_output_id: portfolio.id,
        p_slots: [
          { booking_date: dateInKolkata(), slot_code: spec.slot },
        ],
      });
      await assistant.auth.signOut();
    }

    await rpc(leader, "book_studio_slot", {
      p_portfolio_output_id: portfolio.id,
      p_booking_date: dateInKolkata(),
      p_slot_code: spec.slot,
    });

    const [booking] = await getRows(
      "studio_bookings",
      "id",
      [["portfolio_output_id", portfolio.id]]
    );
    await expectRpcError(
      leader,
      "generate_studio_checkin_otp",
      { p_booking_type: "portfolio", p_booking_id: booking.id },
      "permission"
    );

    const adminOtpAttempt = await admin.rpc("generate_studio_checkin_otp", {
      p_booking_type: "portfolio",
      p_booking_id: booking.id,
    });
    if (adminOtpAttempt.error) {
      assert(
        adminOtpAttempt.error.message.includes(
          "OTP is available from 30 minutes before the slot until the slot ends."
        ),
        `Unexpected Admin OTP error: ${adminOtpAttempt.error.message}`
      );
      report.expectedGuards.push({
        fn: "generate_studio_checkin_otp",
        expected: "live booking window",
        actual: adminOtpAttempt.error.message,
      });
      checkpoint(`${spec.label} OTP time-window guard`);
    } else {
      throw new Error(
        "OTP unexpectedly generated outside a controlled live attendance test"
      );
    }

    await setPhysicalAttendance(
      portfolio.id,
      byEmail.get(leaderEmail).id
    );

    const submissionResult = await rpc(leader, "submit_portfolio", {
      p_portfolio_output_id: portfolio.id,
      p_title: `${spec.label} full lifecycle portfolio`,
      p_portfolio_url: `https://drive.google.com/${spec.label.toLowerCase()}-portfolio`,
      p_notes: "Full lifecycle audit submission",
    });
    const submission = Array.isArray(submissionResult)
      ? submissionResult[0]
      : submissionResult;

    await rpc(educator, "add_educator_workflow_comment", {
      p_team_id: teamId,
      p_portfolio_output_id: portfolio.id,
      p_moodboard_submission_id: null,
      p_portfolio_submission_id: submission.submission_id,
      p_body: `${spec.label} educator portfolio monitoring note`,
    });
    await expectRpcError(
      educator,
      "review_portfolio_as_educator",
      {
        p_portfolio_output_id: portfolio.id,
        p_submission_id: submission.submission_id,
        p_decision: "approved",
        p_comments: null,
      },
      "permission"
    );

    await rpc(admin, "review_portfolio_admin_only", {
      p_portfolio_output_id: portfolio.id,
      p_submission_id: submission.submission_id,
      p_decision: "approved",
      p_comments: `${spec.label} portfolio approved`,
    });
    checkpoint(
      `Stage 3 ${spec.label} portfolio`,
      "Moodboard, booking, comments, submission, and Admin approval passed"
    );

    await leader.auth.signOut();
    await educator.auth.signOut();
  }

  let [team] = await getRows(
    "teams",
    "current_stage_number,stage_status",
    [["id", teamId]]
  );
  assert(team.current_stage_number === 4, "Stage 4 did not open");
  checkpoint("Stage 3 completion", "All three portfolios approved; Stage 4 opened");

  await rpc(admin, "schedule_brand_works", {
    p_team_id: teamId,
    p_brand_works_date: dateInKolkata(),
    p_remarks: "Full lifecycle audit Brand Works",
  });
  await rpc(admin, "complete_brand_works", { p_team_id: teamId });
  checkpoint("Stage 4 Brand Works", "Scheduled, completed, and Stage 5 opened");

  for (const student of Object.values(teamStudents)) {
    await rpc(admin, "approve_student_ecosystem_access", {
      p_student_id: student.id,
    });
  }
  checkpoint("Stage 5 ecosystem review", "All three students granted access");

  const entitlements = await getRows(
    "personal_shoot_entitlements",
    "student_id,total_credits,used_credits"
  );
  const teamEntitlements = entitlements.filter((entitlement) =>
    Object.values(teamStudents).some(
      (student) => student.id === entitlement.student_id
    )
  );
  assert(teamEntitlements.length === 3, "Not all personal credits were granted");
  assert(
    teamEntitlements.every(
      (entitlement) =>
        entitlement.total_credits === 2 && entitlement.used_credits === 0
    ),
    "Personal credits were not initialized at 2"
  );

  const personalSlots = [
    [1, "slot_06_09"],
    [1, "slot_09_12"],
    [1, "slot_12_15"],
    [1, "slot_15_18"],
    [1, "slot_18_21"],
    [2, "slot_06_09"],
  ];
  let slotIndex = 0;
  for (const studentKey of ["photo", "makeup", "hair"]) {
    const studentClient = await signIn(emails[studentKey]);
    for (let credit = 1; credit <= 2; credit += 1) {
      const [dayOffset, slotCode] = personalSlots[slotIndex];
      slotIndex += 1;
      await rpc(studentClient, "book_personal_studio_slot", {
        p_booking_date: dateInKolkata(dayOffset),
        p_slot_code: slotCode,
        p_purpose: `${studentKey} personal audit shoot ${credit}`,
      });
    }
    await expectRpcError(
      studentClient,
      "book_personal_studio_slot",
      {
        p_booking_date: dateInKolkata(2),
        p_slot_code: "slot_09_12",
        p_purpose: `${studentKey} forbidden third shoot`,
      },
      "used both"
    );
    await studentClient.auth.signOut();
  }
  checkpoint("Personal studio credits", "Six personal bookings created; third booking blocked");

  const portfolioBookings = await getRows(
    "studio_bookings",
    "id",
    [["team_id", teamId]]
  );
  const personalBookings = await getRows(
    "personal_studio_bookings",
    "id",
    [["team_id", teamId]]
  );
  assert(portfolioBookings.length === 3, "Team portfolio bookings are not 3");
  assert(personalBookings.length === 6, "Team personal bookings are not 6");

  stageRows = await getRows(
    "team_stage_progress",
    "stage_number,status",
    [["team_id", teamId]]
  );
  const finalStageStatus = new Map(
    stageRows.map((stage) => [stage.stage_number, stage.status])
  );
  assert(
    [0, 1, 2, 3, 4].every(
      (stageNumber) => finalStageStatus.get(stageNumber) === "completed"
    ),
    "Stages 0 through 4 are not completed"
  );
  assert(finalStageStatus.get(5) === "in_progress", "Stage 5 is not in review state");

  team = (
    await getRows("teams", "current_stage_number,stage_status", [["id", teamId]])
  )[0];
  assert(team.current_stage_number === 5, "Team did not reach Stage 5");
  checkpoint("Nine-shoot team allocation", "3 team bookings + 6 personal bookings");

  report.finishedAt = new Date().toISOString();
  report.teamId = teamId;
  report.programId = programId;
  report.summary = {
    completedStages: [0, 1, 2, 3, 4],
    currentStage: 5,
    portfolioBookings: portfolioBookings.length,
    personalBookings: personalBookings.length,
    educatorComments: (
      await getRows("workflow_comments", "id", [["team_id", teamId]])
    ).length,
  };
  console.log("");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  report.failedAt = new Date().toISOString();
  report.failure = error.message ?? String(error);
  console.error("");
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
});
