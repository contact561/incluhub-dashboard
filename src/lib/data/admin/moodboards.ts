import { createClient } from "@/lib/supabase/server";
import type { StudentCategory } from "@/types/database";

export type AdminMoodboardQueueItem = {
  submissionId: string;
  portfolioOutputId: string;
  versionNumber: number;
  title: string;
  moodboardUrl: string;
  notes: string | null;
  submittedAt: string;
  teamName: string;
  leaderName: string;
  portfolioType: StudentCategory;
};

export async function getAdminMoodboardQueue(): Promise<{
  items: AdminMoodboardQueueItem[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: portfolios, error: portfolioError } = await supabase
    .from("portfolio_outputs")
    .select("id, team_id, leader_student_id, portfolio_type")
    .eq("moodboard_status", "pending_admin");

  if (portfolioError) {
    return {
      items: [],
      error: /moodboard_status/i.test(portfolioError.message)
        ? "The moodboard database migration has not been applied."
        : portfolioError.message,
    };
  }

  const portfolioRows = (portfolios ?? []) as Array<{
    id: string;
    team_id: string;
    leader_student_id: string;
    portfolio_type: StudentCategory;
  }>;
  if (portfolioRows.length === 0) return { items: [], error: null };

  const portfolioIds = portfolioRows.map((row) => row.id);
  const teamIds = Array.from(new Set(portfolioRows.map((row) => row.team_id)));
  const studentIds = Array.from(
    new Set(portfolioRows.map((row) => row.leader_student_id))
  );

  const [submissionResult, teamResult, studentResult] = await Promise.all([
    supabase
      .from("moodboard_submissions")
      .select(
        "id, portfolio_output_id, version_number, title, moodboard_url, notes, created_at"
      )
      .in("portfolio_output_id", portfolioIds)
      .order("version_number", { ascending: false }),
    supabase.from("teams").select("id, team_name").in("id", teamIds),
    supabase
      .from("students")
      .select("id, profiles!user_id(full_name)")
      .in("id", studentIds),
  ]);

  const error =
    submissionResult.error?.message ??
    teamResult.error?.message ??
    studentResult.error?.message ??
    null;
  if (error) return { items: [], error };

  const teamNameById = new Map(
    ((teamResult.data ?? []) as Array<{ id: string; team_name: string }>).map(
      (team) => [team.id, team.team_name] as const
    )
  );
  const leaderNameById = new Map(
    (
      (studentResult.data ?? []) as unknown as Array<{
        id: string;
        profiles: { full_name: string } | null;
      }>
    ).map((student) => [
      student.id,
      student.profiles?.full_name ?? "Student",
    ])
  );
  const portfolioById = new Map(
    portfolioRows.map((portfolio) => [portfolio.id, portfolio] as const)
  );
  const latestByPortfolio = new Map<
    string,
    (typeof submissionResult.data & object[])[number]
  >();
  for (const submission of submissionResult.data ?? []) {
    if (!latestByPortfolio.has(submission.portfolio_output_id)) {
      latestByPortfolio.set(submission.portfolio_output_id, submission);
    }
  }

  const items: AdminMoodboardQueueItem[] = [];
  for (const [portfolioId, submission] of latestByPortfolio) {
    const portfolio = portfolioById.get(portfolioId);
    if (!portfolio) continue;
    items.push({
      submissionId: submission.id,
      portfolioOutputId: portfolioId,
      versionNumber: submission.version_number,
      title: submission.title,
      moodboardUrl: submission.moodboard_url,
      notes: submission.notes,
      submittedAt: submission.created_at,
      teamName: teamNameById.get(portfolio.team_id) ?? "—",
      leaderName: leaderNameById.get(portfolio.leader_student_id) ?? "Student",
      portfolioType: portfolio.portfolio_type,
    });
  }

  return {
    items: items.sort(
      (a, b) =>
        new Date(a.submittedAt).getTime() -
        new Date(b.submittedAt).getTime()
    ),
    error: null,
  };
}
