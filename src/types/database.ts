/**
 * Database types for IncluHub Dashboard.
 *
 * These types are manually scaffolded from docs/Database_Plan.md.
 * Once the Supabase project is fully set up, replace this file with
 * the output of: npx supabase gen types typescript --project-id <id>
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type UserRole = "admin" | "student" | "educator" | "external_member";

export type StudentCategory =
  | "makeup_artist"
  | "photographer"
  | "hairstylist";

export type EducatorType =
  | "makeup_educator"
  | "photography_educator"
  | "hairstyling_educator";

export type ExternalMemberType =
  | "model"
  | "creative_director"
  | "photographer"
  | "brand_mentor"
  | "shoot_mentor"
  | "other";

export type StageStatus =
  | "locked"
  | "not_started"
  | "in_progress"
  | "pending_approval"
  | "completed"
  | "rejected"
  | "revision_required";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "revision_required";

export type PaymentStatus =
  | "pending"
  | "confirmed"
  | "waived"
  | "not_required";

// ---------------------------------------------------------------------------
// Table row types
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: "active" | "inactive" | "suspended";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Institute {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website_or_social: string | null;
  authorized_person_name: string | null;
  status: "active" | "inactive";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  institute_id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "active" | "completed" | "paused";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  user_id: string;
  institute_id: string;
  student_category: StudentCategory;
  payment_status: PaymentStatus;
  joining_date: string | null;
  course_start_date: string | null;
  course_end_date: string | null;
  current_team_id: string | null;
  current_stage_number: number;
  status: "active" | "inactive" | "suspended" | "completed";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Educator {
  id: string;
  user_id: string;
  institute_id: string;
  educator_type: EducatorType;
  status: "active" | "inactive";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ExternalMember {
  id: string;
  user_id: string;
  external_member_type: ExternalMemberType;
  bio: string | null;
  status: "active" | "inactive";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  institute_id: string;
  program_id: string;
  team_name: string;
  current_stage_number: number;
  stage_status: StageStatus;
  status: "active" | "completed" | "paused";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  student_id: string;
  student_category: StudentCategory;
  member_status: "active" | "removed";
  joined_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamEducator {
  id: string;
  team_id: string;
  educator_id: string;
  educator_type: EducatorType;
  status: "active" | "inactive";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Stage {
  id: string;
  stage_number: number;
  name: string;
  description: string | null;
  requires_admin_approval: boolean;
  requires_educator_approval: boolean;
  status: "active" | "inactive";
}

export interface TeamStageProgress {
  id: string;
  team_id: string;
  stage_id: string;
  stage_number: number;
  status: StageStatus;
  started_at: string | null;
  completed_at: string | null;
  admin_approval_status: ApprovalStatus;
  admin_approved_by: string | null;
  admin_approved_at: string | null;
  admin_remarks: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PortfolioOutput {
  id: string;
  team_id: string;
  portfolio_type: StudentCategory;
  leader_student_id: string;
  portfolio_title: string;
  portfolio_link: string;
  notes: string | null;
  status: ApprovalStatus;
  submitted_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PortfolioParticipant {
  id: string;
  portfolio_output_id: string;
  student_id: string;
  participation_role: "leader" | "assistant";
  created_at: string;
}

export interface PortfolioApproval {
  id: string;
  portfolio_output_id: string;
  approver_user_id: string;
  approver_role: "educator" | "admin";
  approval_status: ApprovalStatus;
  remarks: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  team_id: string;
  project_name: string;
  project_type:
    | "brand_shoot"
    | "portfolio_shoot"
    | "creative_project"
    | "practice_project"
    | "other";
  project_date: string | null;
  location: string | null;
  instructions: string | null;
  status: StageStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectAssignment {
  id: string;
  project_id: string;
  external_member_id: string;
  assignment_role: string;
  status: "active" | "inactive" | "completed";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectApproval {
  id: string;
  project_id: string;
  approver_user_id: string;
  approver_role: "educator" | "admin";
  approval_status: ApprovalStatus;
  remarks: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  audience_type:
    | "all_students"
    | "all_educators"
    | "all_external"
    | "specific_team"
    | "specific_user";
  priority: "normal" | "high";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationRecipient {
  id: string;
  notification_id: string;
  recipient_user_id: string;
  read_status: boolean;
  read_at: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  actor_user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Database shape (for Supabase generic client typing)
// ---------------------------------------------------------------------------

/** Mapped object type so Insert/Update satisfy Record<string, unknown>. */
type AsRecord<T> = {
  [K in keyof T]: T[K];
};

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type TableDef<Row, Relationships extends Relationship[] = []> = {
  Row: AsRecord<Row>;
  Insert: Partial<AsRecord<Row>> & Record<string, unknown>;
  Update: Partial<AsRecord<Row>> & Record<string, unknown>;
  Relationships: Relationships;
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile>;
      institutes: TableDef<Institute>;
      programs: TableDef<
        Program,
        [
          {
            foreignKeyName: "programs_institute_id_fkey";
            columns: ["institute_id"];
            referencedRelation: "institutes";
            referencedColumns: ["id"];
          },
        ]
      >;
      students: TableDef<
        Student,
        [
          {
            foreignKeyName: "students_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "students_institute_id_fkey";
            columns: ["institute_id"];
            referencedRelation: "institutes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "students_current_team_id_fkey";
            columns: ["current_team_id"];
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ]
      >;
      educators: TableDef<
        Educator,
        [
          {
            foreignKeyName: "educators_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "educators_institute_id_fkey";
            columns: ["institute_id"];
            referencedRelation: "institutes";
            referencedColumns: ["id"];
          },
        ]
      >;
      external_members: TableDef<
        ExternalMember,
        [
          {
            foreignKeyName: "external_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
      teams: TableDef<
        Team,
        [
          {
            foreignKeyName: "teams_institute_id_fkey";
            columns: ["institute_id"];
            referencedRelation: "institutes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teams_program_id_fkey";
            columns: ["program_id"];
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
        ]
      >;
      team_members: TableDef<TeamMember>;
      team_educators: TableDef<TeamEducator>;
      stages: TableDef<Stage>;
      team_stage_progress: TableDef<TeamStageProgress>;
      portfolio_outputs: TableDef<PortfolioOutput>;
      portfolio_participants: TableDef<PortfolioParticipant>;
      portfolio_approvals: TableDef<PortfolioApproval>;
      projects: TableDef<Project>;
      project_assignments: TableDef<ProjectAssignment>;
      project_approvals: TableDef<ProjectApproval>;
      notifications: TableDef<Notification>;
      notification_recipients: TableDef<NotificationRecipient>;
      activity_logs: TableDef<ActivityLog>;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      student_category: StudentCategory;
      educator_type: EducatorType;
      external_member_type: ExternalMemberType;
      stage_status: StageStatus;
      approval_status: ApprovalStatus;
      payment_status: PaymentStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
