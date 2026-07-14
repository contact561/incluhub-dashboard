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

export type PortfolioWorkflowStatus =
  | "locked"
  | "awaiting_booking"
  | "awaiting_submission"
  | "pending_educator"
  | "pending_admin"
  | "revision_required"
  | "completed";

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
  institute_id: string | null;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "active" | "completed" | "paused";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProgramInstitute {
  id: string;
  program_id: string;
  institute_id: string;
  status: "active" | "inactive";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgramEnrollment {
  id: string;
  program_id: string;
  student_id: string;
  status: "active" | "inactive" | "completed" | "removed";
  enrolled_at: string;
  created_by: string | null;
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
  current_stage_number: number | null;
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
  institute_id: string | null;
  program_id: string;
  team_name: string;
  current_stage_number: number | null;
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
  student_id: string;
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
  bms_session_date: string | null;
  bms_remarks: string | null;
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
  portfolio_title: string | null;
  portfolio_link: string | null;
  notes: string | null;
  sequence_order: number | null;
  workflow_status: PortfolioWorkflowStatus | null;
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

export interface StudioSlotOccupancy {
  id: string;
  booking_date: string;
  slot_code: string;
  created_at: string;
}

export interface StudioBooking {
  id: string;
  portfolio_output_id: string;
  team_id: string;
  leader_student_id: string;
  occupancy_id: string;
  created_by: string;
  booked_at: string;
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

export interface PortfolioSubmission {
  id: string;
  portfolio_output_id: string;
  version_number: number;
  title: string;
  portfolio_url: string;
  notes: string | null;
  submitted_by_student_id: string;
  created_by: string;
  created_at: string;
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
      program_institutes: TableDef<
        ProgramInstitute,
        [
          {
            foreignKeyName: "program_institutes_program_id_fkey";
            columns: ["program_id"];
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "program_institutes_institute_id_fkey";
            columns: ["institute_id"];
            referencedRelation: "institutes";
            referencedColumns: ["id"];
          },
        ]
      >;
      program_enrollments: TableDef<
        ProgramEnrollment,
        [
          {
            foreignKeyName: "program_enrollments_program_id_fkey";
            columns: ["program_id"];
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "program_enrollments_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "students";
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
      team_members: TableDef<
        TeamMember,
        [
          {
            foreignKeyName: "team_members_team_id_fkey";
            columns: ["team_id"];
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ]
      >;
      team_educators: TableDef<
        TeamEducator,
        [
          {
            foreignKeyName: "team_educators_team_id_fkey";
            columns: ["team_id"];
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_educators_educator_id_fkey";
            columns: ["educator_id"];
            referencedRelation: "educators";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_educators_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ]
      >;
      stages: TableDef<Stage>;
      team_stage_progress: TableDef<
        TeamStageProgress,
        [
          {
            foreignKeyName: "team_stage_progress_team_id_fkey";
            columns: ["team_id"];
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_stage_progress_stage_id_fkey";
            columns: ["stage_id"];
            referencedRelation: "stages";
            referencedColumns: ["id"];
          },
        ]
      >;
      portfolio_outputs: TableDef<PortfolioOutput>;
      portfolio_participants: TableDef<PortfolioParticipant>;
      portfolio_submissions: TableDef<
        PortfolioSubmission,
        [
          {
            foreignKeyName: "portfolio_submissions_portfolio_output_id_fkey";
            columns: ["portfolio_output_id"];
            referencedRelation: "portfolio_outputs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "portfolio_submissions_submitted_by_student_id_fkey";
            columns: ["submitted_by_student_id"];
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "portfolio_submissions_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
      studio_slot_occupancy: TableDef<StudioSlotOccupancy>;
      studio_bookings: TableDef<
        StudioBooking,
        [
          {
            foreignKeyName: "studio_bookings_portfolio_output_id_fkey";
            columns: ["portfolio_output_id"];
            referencedRelation: "portfolio_outputs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "studio_bookings_team_id_fkey";
            columns: ["team_id"];
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "studio_bookings_leader_student_id_fkey";
            columns: ["leader_student_id"];
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "studio_bookings_occupancy_id_fkey";
            columns: ["occupancy_id"];
            referencedRelation: "studio_slot_occupancy";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "studio_bookings_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
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
      create_program_with_institutes: {
        Args: {
          p_name: string;
          p_description: string | null;
          p_start_date: string | null;
          p_end_date: string | null;
          p_status: string;
          p_institute_ids: string[];
        };
        Returns: string;
      };
      create_balanced_team: {
        Args: {
          p_team_name: string;
          p_program_id: string;
          p_makeup_artist_student_id: string;
          p_photographer_student_id: string;
          p_hairstylist_student_id: string;
          p_makeup_educator_id: string;
          p_photography_educator_id: string;
          p_hairstyling_educator_id: string;
        };
        Returns: string;
      };
      complete_bms_session: {
        Args: {
          p_team_id: string;
          p_session_date: string;
          p_remarks: string | null;
        };
        Returns: undefined;
      };
      start_team_stage_journey: {
        Args: {
          p_team_id: string;
        };
        Returns: undefined;
      };
      get_studio_slot_availability: {
        Args: {
          p_booking_date: string;
        };
        Returns: {
          slot_code: string;
          available: boolean;
        }[];
      };
      book_studio_slot: {
        Args: {
          p_portfolio_output_id: string;
          p_booking_date: string;
          p_slot_code: string;
        };
        Returns: {
          booking_date: string;
          slot_code: string;
          booked_at: string;
        }[];
      };
      submit_portfolio: {
        Args: {
          p_portfolio_output_id: string;
          p_title: string;
          p_portfolio_url: string;
          p_notes: string | null;
        };
        Returns: {
          submission_id: string;
          portfolio_output_id: string;
          version_number: number;
          title: string;
          portfolio_url: string;
          notes: string | null;
          submitted_at: string;
          workflow_status: string;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      student_category: StudentCategory;
      educator_type: EducatorType;
      external_member_type: ExternalMemberType;
      stage_status: StageStatus;
      approval_status: ApprovalStatus;
      payment_status: PaymentStatus;
      portfolio_workflow_status: PortfolioWorkflowStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
