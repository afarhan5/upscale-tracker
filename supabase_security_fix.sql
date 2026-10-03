-- ========================================================
-- SUPABASE SECURITY & PERFORMANCE LINTER FIX SCRIPT
-- ========================================================

-- 1. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Habit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Goal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SkillRoadmap" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Skill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Finance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FocusSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Note" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CalendarNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Payment" ENABLE ROW LEVEL SECURITY;

-- 2. CREATE POLICIES FOR USER-SPECIFIC DATA ACCESS
DO $$
BEGIN
  -- Task
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Task' AND policyname = 'Users can manage their own Tasks') THEN
    CREATE POLICY "Users can manage their own Tasks" ON public."Task" FOR ALL USING (auth.uid()::text = "userId");
  END IF;
  -- Habit
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Habit' AND policyname = 'Users can manage their own Habits') THEN
    CREATE POLICY "Users can manage their own Habits" ON public."Habit" FOR ALL USING (auth.uid()::text = "userId");
  END IF;
  -- Goal
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Goal' AND policyname = 'Users can manage their own Goals') THEN
    CREATE POLICY "Users can manage their own Goals" ON public."Goal" FOR ALL USING (auth.uid()::text = "userId");
  END IF;
  -- SkillRoadmap
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'SkillRoadmap' AND policyname = 'Users can manage their own SkillRoadmaps') THEN
    CREATE POLICY "Users can manage their own SkillRoadmaps" ON public."SkillRoadmap" FOR ALL USING (auth.uid()::text = "userId");
  END IF;
  -- Skill
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Skill' AND policyname = 'Users can manage their own Skills') THEN
    CREATE POLICY "Users can manage their own Skills" ON public."Skill" FOR ALL USING (auth.uid()::text = "userId");
  END IF;
  -- Finance
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Finance' AND policyname = 'Users can manage their own Finance') THEN
    CREATE POLICY "Users can manage their own Finance" ON public."Finance" FOR ALL USING (auth.uid()::text = "userId");
  END IF;
  -- FocusSession
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'FocusSession' AND policyname = 'Users can manage their own FocusSessions') THEN
    CREATE POLICY "Users can manage their own FocusSessions" ON public."FocusSession" FOR ALL USING (auth.uid()::text = "userId");
  END IF;
  -- Note
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Note' AND policyname = 'Users can manage their own Notes') THEN
    CREATE POLICY "Users can manage their own Notes" ON public."Note" FOR ALL USING (auth.uid()::text = "userId");
  END IF;
  -- CalendarNote
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'CalendarNote' AND policyname = 'Users can manage their own CalendarNotes') THEN
    CREATE POLICY "Users can manage their own CalendarNotes" ON public."CalendarNote" FOR ALL USING (auth.uid()::text = "userId");
  END IF;
  -- Payment
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Payment' AND policyname = 'Users can manage their own Payments') THEN
    CREATE POLICY "Users can manage their own Payments" ON public."Payment" FOR ALL USING (auth.uid()::text = "userId");
  END IF;
  -- User
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'User' AND policyname = 'Users can manage their own User profile') THEN
    CREATE POLICY "Users can manage their own User profile" ON public."User" FOR ALL USING (auth.uid()::text = id);
  END IF;
END $$;

-- 3. CREATE INDEXES ON ALL FOREIGN KEYS (PERFORMANCE WARNINGS FIX)
CREATE INDEX IF NOT EXISTS "idx_Task_userId" ON public."Task"("userId");
CREATE INDEX IF NOT EXISTS "idx_Habit_userId" ON public."Habit"("userId");
CREATE INDEX IF NOT EXISTS "idx_Goal_userId" ON public."Goal"("userId");
CREATE INDEX IF NOT EXISTS "idx_SkillRoadmap_userId" ON public."SkillRoadmap"("userId");
CREATE INDEX IF NOT EXISTS "idx_Skill_userId" ON public."Skill"("userId");
CREATE INDEX IF NOT EXISTS "idx_Skill_roadmapId" ON public."Skill"("roadmapId");
CREATE INDEX IF NOT EXISTS "idx_Finance_userId" ON public."Finance"("userId");
CREATE INDEX IF NOT EXISTS "idx_FocusSession_userId" ON public."FocusSession"("userId");
CREATE INDEX IF NOT EXISTS "idx_Note_userId" ON public."Note"("userId");
CREATE INDEX IF NOT EXISTS "idx_Note_folderId" ON public."Note"("folderId");
CREATE INDEX IF NOT EXISTS "idx_CalendarNote_userId" ON public."CalendarNote"("userId");
CREATE INDEX IF NOT EXISTS "idx_Payment_userId" ON public."Payment"("userId");

-- 4. FIX SECURITY DEFINER FUNCTION EXECUTION PERMISSIONS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'handle_new_user') THEN
    REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable') THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO authenticated, service_role;
  END IF;
END $$;
