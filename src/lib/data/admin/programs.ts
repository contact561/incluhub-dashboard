import { createClient } from "@/lib/supabase/server";
import type {
  AdminProgramDetail,
  AdminProgramEnrollmentRow,
  AdminProgramRow,
  AdminProgramsResult,
  EnrollableStudentOption,
} from "@/types/admin-records";
import type { StudentCategory } from "@/types/database";

type ProgramListRow = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  program_institutes: Array<{
    status: string;
    institutes: { name: string } | null;
  }> | null;
};

export async function getAdminPrograms(): Promise<AdminProgramsResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("programs")
    .select(
      `
      id,
      name,
      start_date,
      end_date,
      status,
      program_institutes (
        status,
        institutes!institute_id (
          name
        )
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAdminPrograms]", error.message);
    return { programs: [], error: error.message };
  }

  const programs: AdminProgramRow[] = ((data ?? []) as ProgramListRow[]).map(
    (row) => ({
      id: row.id,
      name: row.name,
      institutes: (row.program_institutes ?? [])
        .filter((link) => link.status === "active")
        .map((link) => link.institutes?.name)
        .filter((name): name is string => Boolean(name)),
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
    })
  );

  return { programs, error: null };
}

export async function getAdminProgramById(
  programId: string
): Promise<{ program: AdminProgramDetail | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("programs")
    .select(
      `
      id,
      name,
      description,
      start_date,
      end_date,
      status,
      program_institutes (
        status,
        institutes!institute_id (
          id,
          name
        )
      ),
      program_enrollments (
        id,
        status,
        enrolled_at,
        students!student_id (
          id,
          student_category,
          current_team_id,
          institutes!institute_id (
            name
          ),
          profiles!user_id (
            full_name,
            email
          )
        )
      )
    `
    )
    .eq("id", programId)
    .maybeSingle();

  if (error) {
    console.error("[getAdminProgramById]", error.message);
    return { program: null, error: error.message };
  }

  if (!data) {
    return { program: null, error: null };
  }

  const row = data as {
    id: string;
    name: string;
    description: string | null;
    start_date: string | null;
    end_date: string | null;
    status: string;
    program_institutes: Array<{
      status: string;
      institutes: { id: string; name: string } | null;
    }> | null;
    program_enrollments: Array<{
      id: string;
      status: string;
      enrolled_at: string;
      students: {
        id: string;
        student_category: StudentCategory;
        current_team_id: string | null;
        institutes: { name: string } | null;
        profiles: { full_name: string; email: string } | null;
      } | null;
    }> | null;
  };

  const enrollments: AdminProgramEnrollmentRow[] = (
    row.program_enrollments ?? []
  )
    .filter((enrollment) => enrollment.status === "active")
    .map((enrollment) => ({
      id: enrollment.id,
      studentId: enrollment.students?.id ?? "",
      fullName: enrollment.students?.profiles?.full_name ?? "—",
      email: enrollment.students?.profiles?.email ?? "—",
      category: enrollment.students?.student_category ?? "makeup_artist",
      institute: enrollment.students?.institutes?.name ?? null,
      status: enrollment.status,
      enrolledAt: enrollment.enrolled_at,
      currentTeamId: enrollment.students?.current_team_id ?? null,
    }));

  return {
    program: {
      id: row.id,
      name: row.name,
      description: row.description,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      institutes: (row.program_institutes ?? [])
        .filter((link) => link.status === "active" && link.institutes)
        .map((link) => ({
          id: link.institutes!.id,
          name: link.institutes!.name,
        })),
      enrollments,
    },
    error: null,
  };
}

export async function getEnrollableStudentsForProgram(
  programId: string
): Promise<{ students: EnrollableStudentOption[]; error: string | null }> {
  const supabase = await createClient();

  const { data: links, error: linksError } = await supabase
    .from("program_institutes")
    .select("institute_id")
    .eq("program_id", programId)
    .eq("status", "active");

  if (linksError) {
    return { students: [], error: linksError.message };
  }

  const instituteIds = (links ?? []).map((row) => row.institute_id as string);

  if (instituteIds.length === 0) {
    return { students: [], error: null };
  }

  const { data: enrolled, error: enrolledError } = await supabase
    .from("program_enrollments")
    .select("student_id")
    .eq("program_id", programId)
    .eq("status", "active");

  if (enrolledError) {
    return { students: [], error: enrolledError.message };
  }

  const enrolledIds = new Set(
    (enrolled ?? []).map((row) => row.student_id as string)
  );

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select(
      `
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
    `
    )
    .eq("status", "active")
    .is("current_team_id", null)
    .in("institute_id", instituteIds)
    .order("created_at", { ascending: false });

  if (studentsError) {
    return { students: [], error: studentsError.message };
  }

  const options: EnrollableStudentOption[] = (
    (students ?? []) as Array<{
      id: string;
      institute_id: string;
      student_category: StudentCategory;
      institutes: { name: string } | null;
      profiles: { full_name: string; email: string } | null;
    }>
  )
    .filter((student) => !enrolledIds.has(student.id))
    .map((student) => ({
      id: student.id,
      fullName: student.profiles?.full_name ?? "—",
      email: student.profiles?.email ?? "—",
      category: student.student_category,
      instituteId: student.institute_id,
      instituteName: student.institutes?.name ?? "—",
    }));

  return { students: options, error: null };
}
