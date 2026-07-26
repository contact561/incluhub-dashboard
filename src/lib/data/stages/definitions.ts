import { createClient } from "@/lib/supabase/server";
import type { StageDefinition } from "@/types/database";

export async function getActiveStageDefinitions(): Promise<{
  stages: StageDefinition[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stage_definitions")
    .select("id, code, name, stage_type, sort_order, is_active, config")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    if (/stage_definitions|schema cache/i.test(error.message)) {
      return {
        stages: [],
        error:
          "Stage registry is not available yet. Apply migration 025 on the experiment database.",
      };
    }
    return { stages: [], error: error.message };
  }

  return {
    stages: (data ?? []).map((row) => ({
      ...row,
      config:
        row.config && typeof row.config === "object" && !Array.isArray(row.config)
          ? (row.config as Record<string, unknown>)
          : {},
    })),
    error: null,
  };
}
