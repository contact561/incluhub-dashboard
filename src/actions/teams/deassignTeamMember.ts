"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TeamMembershipState = {
  error?: string;
  success?: string;
};

function mapMembershipError(message: string): string {
  const known = [
    "You do not have permission to perform this action.",
    "Team was not found.",
    "Only active teams can be edited.",
    "Active team member was not found.",
    "Student was not found.",
    "Student must be active.",
    "Only makeup, photographer, and hairstylist students can join studio teams.",
    "Student is already on an active team.",
    "This team already has an active member for that category.",
    "Student must be enrolled in this team's program.",
    "Student institute must participate in this program.",
    "Educator was not found or is not active.",
    "Educator type must match the student category.",
    "Educator must belong to the student institute.",
  ].find((item) => message.includes(item));
  return known ?? "Team membership could not be updated.";
}

export async function deassignTeamMemberAction(
  _prev: TeamMembershipState,
  formData: FormData
): Promise<TeamMembershipState> {
  const teamId = formData.get("team_id");
  const studentId = formData.get("student_id");
  if (typeof teamId !== "string" || typeof studentId !== "string") {
    return { error: "Team and student are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("deassign_team_member", {
    p_team_id: teamId,
    p_student_id: studentId,
  });

  if (error) {
    return { error: mapMembershipError(error.message) };
  }

  revalidatePath(`/admin/teams/${teamId}`);
  revalidatePath("/admin/teams");
  revalidatePath("/student/my-team");
  revalidatePath("/educator/dashboard");
  return { success: "Student removed from this team." };
}

export async function assignTeamMemberSlotAction(
  _prev: TeamMembershipState,
  formData: FormData
): Promise<TeamMembershipState> {
  const teamId = formData.get("team_id");
  const studentId = formData.get("student_id");
  const educatorId = formData.get("educator_id");
  if (
    typeof teamId !== "string" ||
    typeof studentId !== "string" ||
    typeof educatorId !== "string"
  ) {
    return { error: "Team, student, and educator are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_team_member_slot", {
    p_team_id: teamId,
    p_student_id: studentId,
    p_educator_id: educatorId,
  });

  if (error) {
    return { error: mapMembershipError(error.message) };
  }

  revalidatePath(`/admin/teams/${teamId}`);
  revalidatePath("/admin/teams");
  revalidatePath("/student/my-team");
  revalidatePath("/educator/dashboard");
  return { success: "Student assigned to this team." };
}
