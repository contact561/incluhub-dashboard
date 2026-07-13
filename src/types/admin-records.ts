import type {
  EducatorType,
  ExternalMemberType,
  PaymentStatus,
  StageStatus,
  StudentCategory,
  UserRole,
} from "@/types/database";

export type AdminUserRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: string;
  createdAt: string;
};

export type AdminUsersResult = {
  users: AdminUserRow[];
  error: string | null;
};

export type AdminStudentRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  studentCategory: StudentCategory;
  institute: string | null;
  currentTeam: string | null;
  currentStageNumber: number;
  paymentStatus: PaymentStatus;
  status: string;
};

export type AdminEducatorRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  educatorType: EducatorType;
  institute: string | null;
  assignedTeamsCount: number;
  status: string;
};

export type AdminExternalMemberRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  externalMemberType: ExternalMemberType;
  assignedProjectsCount: number;
  status: string;
};

export type AdminInstituteRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
};

export type AdminInstitutesResult = {
  institutes: AdminInstituteRow[];
  error: string | null;
};

export type AdminProgramRow = {
  id: string;
  name: string;
  institutes: string[];
  startDate: string | null;
  endDate: string | null;
  status: string;
};

export type AdminProgramsResult = {
  programs: AdminProgramRow[];
  error: string | null;
};

export type AdminProgramEnrollmentRow = {
  id: string;
  studentId: string;
  fullName: string;
  email: string;
  category: StudentCategory;
  institute: string | null;
  status: string;
  enrolledAt: string;
  currentTeamId: string | null;
};

export type AdminProgramDetail = {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  institutes: { id: string; name: string }[];
  enrollments: AdminProgramEnrollmentRow[];
};

export type EnrollableStudentOption = {
  id: string;
  fullName: string;
  email: string;
  category: StudentCategory;
  instituteId: string;
  instituteName: string;
};

export type AdminTeamMemberSummary = {
  fullName: string | null;
  institute: string | null;
};

export type AdminTeamRow = {
  id: string;
  teamName: string;
  program: string | null;
  makeupArtist: AdminTeamMemberSummary;
  photographer: AdminTeamMemberSummary;
  hairstylist: AdminTeamMemberSummary;
  currentStageNumber: number;
  status: string;
};

export type AdminTeamsResult = {
  teams: AdminTeamRow[];
  error: string | null;
};

export type AdminTeamMemberDetail = {
  id: string;
  fullName: string;
  email: string;
  category: StudentCategory;
  institute: string | null;
  educator: {
    id: string;
    fullName: string;
    email: string;
    educatorType: EducatorType;
    institute: string | null;
  } | null;
};

export type AdminTeamDetail = {
  id: string;
  teamName: string;
  program: string | null;
  currentStageNumber: number;
  stageStatus: StageStatus;
  status: string;
  createdAt: string;
  students: AdminTeamMemberDetail[];
};

export type TeamCreateProgramOption = {
  id: string;
  name: string;
};

export type TeamCreateStudentOption = {
  id: string;
  fullName: string;
  email: string;
  instituteId: string;
  instituteName: string;
  category: StudentCategory;
  programId: string;
};

export type TeamCreateEducatorOption = {
  id: string;
  fullName: string;
  email: string;
  instituteId: string;
  instituteName: string;
  educatorType: EducatorType;
};

export type TeamCreateProgramEnrollmentStats = {
  programId: string;
  availableCount: number;
  alreadyOnTeamCount: number;
};

export type TeamCreateOptions = {
  programs: TeamCreateProgramOption[];
  students: TeamCreateStudentOption[];
  educators: TeamCreateEducatorOption[];
  enrollmentStats: TeamCreateProgramEnrollmentStats[];
};

export type TeamCreateOptionsResult = {
  options: TeamCreateOptions;
  error: string | null;
};
