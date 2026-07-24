import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type MoodBoardSubmissionView = {
  id: string;
  title: string;
  moodBoardUrl: string;
  notes: string | null;
  versionNumber: number;
  status: string;
  studentName: string;
  studentId: string;
  createdAt: string;
  educatorDecision: string | null;
  adminDecision: string | null;
};

export async function getOwnMoodBoardSubmissions(): Promise<{
  rows: MoodBoardSubmissionView[];
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { rows: [], error: "Not signed in." };
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!student) {
    return { rows: [], error: null };
  }

  const { data, error } = await admin
    .from("mood_board_submissions")
    .select("id, title, mood_board_url, notes, version_number, status, student_id, created_at")
    .eq("student_id", student.id)
    .order("version_number", { ascending: false });

  if (error) {
    if (/mood_board_submissions|schema cache/i.test(error.message)) {
      return {
        rows: [],
        error: "Mood board is not available yet. Apply migration 026.",
      };
    }
    return { rows: [], error: error.message };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return {
    rows: (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      moodBoardUrl: row.mood_board_url,
      notes: row.notes,
      versionNumber: row.version_number,
      status: row.status,
      studentName: profile?.full_name ?? "You",
      studentId: row.student_id,
      createdAt: row.created_at,
      educatorDecision: null,
      adminDecision: null,
    })),
    error: null,
  };
}

export async function getInstituteMoodBoardQueue(): Promise<{
  rows: MoodBoardSubmissionView[];
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { rows: [], error: "Not signed in." };
  }

  const admin = createAdminClient();
  const { data: educator } = await admin
    .from("educators")
    .select("institute_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!educator?.institute_id) {
    return { rows: [], error: null };
  }

  const { data: students } = await admin
    .from("students")
    .select("id, user_id")
    .eq("institute_id", educator.institute_id)
    .eq("status", "active");

  const studentIds = (students ?? []).map((s) => s.id);
  if (studentIds.length === 0) {
    return { rows: [], error: null };
  }

  const { data, error } = await admin
    .from("mood_board_submissions")
    .select("id, title, mood_board_url, notes, version_number, status, student_id, created_at")
    .in("student_id", studentIds)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (/mood_board_submissions|schema cache/i.test(error.message)) {
      return {
        rows: [],
        error: "Mood board is not available yet. Apply migration 026.",
      };
    }
    return { rows: [], error: error.message };
  }

  const userIds = (students ?? []).map((s) => s.user_id);
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const nameByUser = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const userByStudent = new Map((students ?? []).map((s) => [s.id, s.user_id]));

  const submissionIds = (data ?? []).map((row) => row.id);
  const { data: reviews } =
    submissionIds.length > 0
      ? await admin
          .from("mood_board_reviews")
          .select("submission_id, reviewer_role, decision")
          .in("submission_id", submissionIds)
      : { data: [] as { submission_id: string; reviewer_role: string; decision: string }[] };

  const educatorDecision = new Map<string, string>();
  const adminDecision = new Map<string, string>();
  for (const review of reviews ?? []) {
    if (review.reviewer_role === "educator") {
      educatorDecision.set(review.submission_id, review.decision);
    }
    if (review.reviewer_role === "admin") {
      adminDecision.set(review.submission_id, review.decision);
    }
  }

  return {
    rows: (data ?? []).map((row) => {
      const userId = userByStudent.get(row.student_id);
      return {
        id: row.id,
        title: row.title,
        moodBoardUrl: row.mood_board_url,
        notes: row.notes,
        versionNumber: row.version_number,
        status: row.status,
        studentName: (userId && nameByUser.get(userId)) || "Student",
        studentId: row.student_id,
        createdAt: row.created_at,
        educatorDecision: educatorDecision.get(row.id) ?? null,
        adminDecision: adminDecision.get(row.id) ?? null,
      };
    }),
    error: null,
  };
}

export async function getTeamMoodBoardSummary(teamId: string): Promise<{
  latestStatus: string | null;
  error: string | null;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("mood_board_submissions")
    .select("status")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    if (/mood_board_submissions|schema cache/i.test(error.message)) {
      return { latestStatus: null, error: null };
    }
    return { latestStatus: null, error: error.message };
  }

  const rows = data ?? [];
  if (rows.some((row) => row.status === "approved")) {
    return { latestStatus: "approved", error: null };
  }
  if (rows.some((row) => row.status === "pending_review")) {
    return { latestStatus: "pending_review", error: null };
  }
  if (rows.some((row) => row.status === "revision_required")) {
    return { latestStatus: "revision_required", error: null };
  }
  return { latestStatus: null, error: null };
}
