import { getEducatorContext } from "@/lib/data/educator/context";
import { getEducatorReviewQueue } from "@/lib/data/educator/portfolio-reviews";
import { createClient } from "@/lib/supabase/server";
import type { EducatorDashboardData } from "@/types/educator-portfolio";

export async function getEducatorDashboardData(): Promise<{
  data: EducatorDashboardData | null;
  error: string | null;
}> {
  const [{ context, error: contextError }, queue] = await Promise.all([
    getEducatorContext(),
    getEducatorReviewQueue(),
  ]);
  if (contextError || queue.error) {
    return { data: null, error: contextError ?? queue.error };
  }
  if (!context) {
    return { data: null, error: "Your educator profile could not be found." };
  }

  const supabase = await createClient();
  const { count, error: commentError } = await supabase
    .from("workflow_comments")
    .select("id", { count: "exact", head: true })
    .eq("author_user_id", context.userId);
  if (commentError) {
    return {
      data: null,
      error: /workflow_comments/i.test(commentError.message)
        ? "The latest workflow database migration has not been applied."
        : commentError.message,
    };
  }

  return {
    data: {
      summary: {
        assignedTeamsCount: context.mappedTeamIds.length,
        assignedStudentsCount: context.mappedStudentIds.length,
        awaitingReviewCount: queue.items.length,
        reviewsCompletedCount: count ?? 0,
      },
      pendingPreviews: queue.items.slice(0, 5),
    },
    error: null,
  };
}
