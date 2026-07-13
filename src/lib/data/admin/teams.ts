import { createClient } from "@/lib/supabase/server";
import type {
  AdminTeamDetail,
  AdminTeamMemberDetail,
  AdminTeamMemberSummary,
  AdminTeamRow,
  AdminTeamsResult,
  TeamCreateOptions,
  TeamCreateOptionsResult,
} from "@/types/admin-records";
import type {
  EducatorType,
  StageStatus,
  StudentCategory,
} from "@/types/database";

type TeamListQueryRow = {
  id: string;
  team_name: string;
  current_stage_number: number | null;
  status: string;
  programs: { name: string } | null;
  team_members: Array<{
    student_category: StudentCategory;
    member_status: string;
    students: {
      profiles: { full_name: string } | null;
      institutes: { name: string } | null;
    } | null;
  }> | null;
};

function memberSummary(
  members: TeamListQueryRow["team_members"],
  category: StudentCategory
): AdminTeamMemberSummary {
  const match = (members ?? []).find(
    (member) =>
      member.member_status === "active" &&
      member.student_category === category
  );
  return {
    fullName: match?.students?.profiles?.full_name ?? null,
    institute: match?.students?.institutes?.name ?? null,
  };
}

export async function getAdminTeams(): Promise<AdminTeamsResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select(
      `
      id,
      team_name,
      current_stage_number,
      status,
      programs!program_id (
        name
      ),
      team_members (
        student_category,
        member_status,
        students!student_id (
          profiles!user_id (
            full_name
          ),
          institutes!institute_id (
            name
          )
        )
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAdminTeams]", error.message);
    return { teams: [], error: error.message };
  }

  const teams: AdminTeamRow[] = ((data ?? []) as TeamListQueryRow[]).map(
    (row) => ({
      id: row.id,
      teamName: row.team_name,
      program: row.programs?.name ?? null,
      makeupArtist: memberSummary(row.team_members, "makeup_artist"),
      photographer: memberSummary(row.team_members, "photographer"),
      hairstylist: memberSummary(row.team_members, "hairstylist"),
      currentStageNumber: row.current_stage_number,
      status: row.status,
    })
  );

  return { teams, error: null };
}

export async function getAdminTeamById(
  teamId: string
): Promise<{ team: AdminTeamDetail | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select(
      `
      id,
      team_name,
      current_stage_number,
      stage_status,
      status,
      created_at,
      programs!program_id (
        name
      ),
      team_members (
        id,
        student_category,
        member_status,
        student_id,
        students!student_id (
          id,
          profiles!user_id (
            full_name,
            email
          ),
          institutes!institute_id (
            name
          )
        )
      ),
      team_educators (
        id,
        student_id,
        educator_type,
        status,
        educators!educator_id (
          id,
          profiles!user_id (
            full_name,
            email
          ),
          institutes!institute_id (
            name
          )
        )
      )
    `
    )
    .eq("id", teamId)
    .maybeSingle();

  if (error) {
    console.error("[getAdminTeamById]", error.message);
    return { team: null, error: error.message };
  }

  if (!data) {
    return { team: null, error: null };
  }

  const row = data as {
    id: string;
    team_name: string;
    current_stage_number: number | null;
    stage_status: StageStatus;
    status: string;
    created_at: string;
    programs: { name: string } | null;
    team_members: Array<{
      id: string;
      student_id: string;
      student_category: StudentCategory;
      member_status: string;
      students: {
        id: string;
        profiles: { full_name: string; email: string } | null;
        institutes: { name: string } | null;
      } | null;
    }> | null;
    team_educators: Array<{
      id: string;
      student_id: string;
      educator_type: EducatorType;
      status: string;
      educators: {
        id: string;
        profiles: { full_name: string; email: string } | null;
        institutes: { name: string } | null;
      } | null;
    }> | null;
  };

  const educatorsByStudent = new Map(
    (row.team_educators ?? [])
      .filter((assignment) => assignment.status === "active")
      .map((assignment) => [assignment.student_id, assignment])
  );

  const students: AdminTeamMemberDetail[] = (row.team_members ?? [])
    .filter((member) => member.member_status === "active")
    .map((member) => {
      const educator = educatorsByStudent.get(member.student_id);
      return {
        id: member.students?.id ?? member.id,
        fullName: member.students?.profiles?.full_name ?? "—",
        email: member.students?.profiles?.email ?? "—",
        category: member.student_category,
        institute: member.students?.institutes?.name ?? null,
        educator: educator
          ? {
              id: educator.educators?.id ?? educator.id,
              fullName: educator.educators?.profiles?.full_name ?? "—",
              email: educator.educators?.profiles?.email ?? "—",
              educatorType: educator.educator_type,
              institute: educator.educators?.institutes?.name ?? null,
            }
          : null,
      };
    });

  return {
    team: {
      id: row.id,
      teamName: row.team_name,
      program: row.programs?.name ?? null,
      currentStageNumber: row.current_stage_number,
      stageStatus: row.stage_status,
      status: row.status,
      createdAt: row.created_at,
      students,
    },
    error: null,
  };
}

export async function getTeamCreateOptions(): Promise<TeamCreateOptionsResult> {
  const supabase = await createClient();

  const [programsResult, enrollmentsResult, educatorsResult] =
    await Promise.all([
      supabase
        .from("programs")
        .select("id, name")
        .eq("status", "active")
        .order("name", { ascending: true }),
      supabase
        .from("program_enrollments")
        .select(
          `
          program_id,
          status,
          students!student_id (
            id,
            institute_id,
            student_category,
            status,
            current_team_id,
            institutes!institute_id (
              name
            ),
            profiles!user_id (
              full_name,
              email
            )
          )
        `
        )
        .eq("status", "active"),
      supabase
        .from("educators")
        .select(
          `
          id,
          institute_id,
          educator_type,
          status,
          institutes!institute_id (
            name
          ),
          profiles!user_id (
            full_name,
            email
          )
        `
        )
        .eq("status", "active")
        .order("created_at", { ascending: false }),
    ]);

  const firstError =
    programsResult.error?.message ||
    enrollmentsResult.error?.message ||
    educatorsResult.error?.message ||
    null;

  if (firstError) {
    console.error("[getTeamCreateOptions]", firstError);
    return {
      options: {
        programs: [],
        students: [],
        educators: [],
        enrollmentStats: [],
      },
      error: firstError,
    };
  }

  const enrollmentRows = (enrollmentsResult.data ?? []) as Array<{
    program_id: string;
    students: {
      id: string;
      institute_id: string;
      student_category: StudentCategory;
      status: string;
      current_team_id: string | null;
      institutes: { name: string } | null;
      profiles: { full_name: string; email: string } | null;
    } | null;
  }>;

  const activeEnrollments = enrollmentRows.filter(
    (row) => row.students && row.students.status === "active"
  );

  const availableStudents = activeEnrollments.filter(
    (row) => row.students!.current_team_id === null
  );

  const statsByProgram = new Map<
    string,
    { availableCount: number; alreadyOnTeamCount: number }
  >();

  for (const row of activeEnrollments) {
    const current = statsByProgram.get(row.program_id) ?? {
      availableCount: 0,
      alreadyOnTeamCount: 0,
    };
    if (row.students!.current_team_id) {
      current.alreadyOnTeamCount += 1;
    } else {
      current.availableCount += 1;
    }
    statsByProgram.set(row.program_id, current);
  }

  const options: TeamCreateOptions = {
    programs: (programsResult.data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
    })),
    students: availableStudents.map((row) => ({
      id: row.students!.id,
      fullName: row.students!.profiles?.full_name ?? "—",
      email: row.students!.profiles?.email ?? "—",
      instituteId: row.students!.institute_id,
      instituteName: row.students!.institutes?.name ?? "—",
      category: row.students!.student_category,
      programId: row.program_id,
    })),
    educators: (
      (educatorsResult.data ?? []) as Array<{
        id: string;
        institute_id: string;
        educator_type: EducatorType;
        institutes: { name: string } | null;
        profiles: { full_name: string; email: string } | null;
      }>
    ).map((row) => ({
      id: row.id,
      fullName: row.profiles?.full_name ?? "—",
      email: row.profiles?.email ?? "—",
      instituteId: row.institute_id,
      instituteName: row.institutes?.name ?? "—",
      educatorType: row.educator_type,
    })),
    enrollmentStats: Array.from(statsByProgram.entries()).map(
      ([programId, stats]) => ({
        programId,
        availableCount: stats.availableCount,
        alreadyOnTeamCount: stats.alreadyOnTeamCount,
      })
    ),
  };

  return { options, error: null };
}
