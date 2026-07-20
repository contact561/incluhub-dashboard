-- =============================================================================
-- RLS 007: notifications, Stage 3 availability, and Stage 4 Brand Opportunity
-- Depends on migrations 014-016.
-- =============================================================================

ALTER TABLE public.studio_availability_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_checkin_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_opportunity_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_work_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_work_submission_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_availability_select_admin"
  ON public.studio_availability_responses FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "studio_availability_select_student_team"
  ON public.studio_availability_responses FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.portfolio_outputs po
    WHERE po.id = portfolio_output_id
      AND po.team_id = public.my_active_team_id()
  ));

CREATE POLICY "studio_availability_select_educator_team"
  ON public.studio_availability_responses FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.portfolio_outputs po
    WHERE po.id = portfolio_output_id
      AND public.is_educator_assigned_to_team(po.team_id)
  ));

CREATE POLICY "brand_opportunities_select_admin"
  ON public.brand_opportunities FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "brand_opportunities_select_student_team"
  ON public.brand_opportunities FOR SELECT TO authenticated
  USING (team_id = public.my_active_team_id());

CREATE POLICY "brand_opportunities_select_educator_team"
  ON public.brand_opportunities FOR SELECT TO authenticated
  USING (public.is_educator_assigned_to_team(team_id));

CREATE POLICY "brand_opportunity_files_select_scoped"
  ON public.brand_opportunity_files FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.brand_opportunities bo
    WHERE bo.id = opportunity_id
      AND (
        public.is_admin()
        OR bo.team_id = public.my_active_team_id()
        OR public.is_educator_assigned_to_team(bo.team_id)
      )
  ));

CREATE POLICY "brand_submissions_select_scoped"
  ON public.brand_work_submissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.brand_opportunities bo
    WHERE bo.id = opportunity_id
      AND (
        public.is_admin()
        OR bo.team_id = public.my_active_team_id()
        OR public.is_educator_assigned_to_team(bo.team_id)
      )
  ));

CREATE POLICY "brand_submission_files_select_scoped"
  ON public.brand_work_submission_files FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.brand_work_submissions bws
    JOIN public.brand_opportunities bo ON bo.id = bws.opportunity_id
    WHERE bws.id = submission_id
      AND (
        public.is_admin()
        OR bo.team_id = public.my_active_team_id()
        OR public.is_educator_assigned_to_team(bo.team_id)
      )
  ));

-- Storage writes are server-only after a role check. Authenticated users receive
-- read access only to their own/assigned team path. Signed URLs are generated
-- server-side and remain short lived.
DROP POLICY IF EXISTS "brand_storage_select_scoped" ON storage.objects;
CREATE POLICY "brand_storage_select_scoped"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'brand-opportunity-files'
    AND array_length(storage.foldername(name), 1) >= 2
    AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[2]::uuid = public.my_active_team_id()
      OR public.is_educator_assigned_to_team((storage.foldername(name))[2]::uuid)
    )
  );

