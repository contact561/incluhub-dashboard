import type {
  EducatorType,
  ExternalMemberType,
  PaymentStatus,
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
  institute: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
};

export type AdminProgramsResult = {
  programs: AdminProgramRow[];
  error: string | null;
};
