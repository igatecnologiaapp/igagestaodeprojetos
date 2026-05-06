
-- Add task scheduling/contact fields
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text;

-- Project sharing
CREATE TABLE IF NOT EXISTS public.project_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  permission text NOT NULL DEFAULT 'view' CHECK (permission IN ('view','edit')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
ALTER TABLE public.project_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shares_select_auth" ON public.project_shares FOR SELECT TO authenticated USING (true);
CREATE POLICY "shares_manage_admin_or_owner" ON public.project_shares FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin') OR
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid())
  );

-- Task sharing
CREATE TABLE IF NOT EXISTS public.task_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  permission text NOT NULL DEFAULT 'view' CHECK (permission IN ('view','edit')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);
ALTER TABLE public.task_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_shares_select_auth" ON public.task_shares FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_shares_manage_admin_or_owner" ON public.task_shares FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.created_by = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin') OR
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.created_by = auth.uid())
  );
