
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'colaborador', 'visualizador');
CREATE TYPE public.company_status AS ENUM ('ativa', 'inativa');
CREATE TYPE public.project_status AS ENUM ('planejamento', 'em_andamento', 'pausado', 'concluido', 'cancelado');
CREATE TYPE public.task_status AS ENUM ('nao_iniciada', 'em_andamento', 'concluida');
CREATE TYPE public.task_priority AS ENUM ('baixa', 'media', 'alta', 'urgente');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  job_title TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'colaborador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- has_role function (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id ORDER BY 
    CASE role WHEN 'admin' THEN 1 WHEN 'colaborador' THEN 2 ELSE 3 END LIMIT 1
$$;

-- Companies
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  neighborhood TEXT,
  zip_code TEXT,
  city TEXT,
  state TEXT,
  status public.company_status NOT NULL DEFAULT 'ativa',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  description TEXT,
  value NUMERIC(14,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status public.project_status NOT NULL DEFAULT 'planejamento',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES auth.users(id),
  start_date DATE,
  due_date DATE,
  priority public.task_priority NOT NULL DEFAULT 'media',
  status public.task_status NOT NULL DEFAULT 'nao_iniciada',
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subtasks
CREATE TABLE public.subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments (polymorphic via project_id/task_id)
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (project_id IS NOT NULL OR task_id IS NOT NULL)
);

-- Attachments
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (project_id IS NOT NULL OR task_id IS NOT NULL)
);

-- Activity log
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- New user trigger: create profile + default colaborador role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INTEGER;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  
  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'colaborador');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_all_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "user_roles_select_all_auth" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Companies policies
CREATE POLICY "companies_select_auth" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "companies_insert_not_visualizador" ON public.companies FOR INSERT TO authenticated 
  WITH CHECK (NOT public.has_role(auth.uid(), 'visualizador'));
CREATE POLICY "companies_update_not_visualizador" ON public.companies FOR UPDATE TO authenticated 
  USING (NOT public.has_role(auth.uid(), 'visualizador'));
CREATE POLICY "companies_delete_admin" ON public.companies FOR DELETE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- Projects policies (same pattern)
CREATE POLICY "projects_select_auth" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_insert_nv" ON public.projects FOR INSERT TO authenticated WITH CHECK (NOT public.has_role(auth.uid(), 'visualizador'));
CREATE POLICY "projects_update_nv" ON public.projects FOR UPDATE TO authenticated USING (NOT public.has_role(auth.uid(), 'visualizador'));
CREATE POLICY "projects_delete_admin" ON public.projects FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Tasks policies
CREATE POLICY "tasks_select_auth" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks_insert_nv" ON public.tasks FOR INSERT TO authenticated WITH CHECK (NOT public.has_role(auth.uid(), 'visualizador'));
CREATE POLICY "tasks_update_nv" ON public.tasks FOR UPDATE TO authenticated USING (NOT public.has_role(auth.uid(), 'visualizador'));
CREATE POLICY "tasks_delete_nv" ON public.tasks FOR DELETE TO authenticated USING (NOT public.has_role(auth.uid(), 'visualizador'));

-- Subtasks
CREATE POLICY "subtasks_select_auth" ON public.subtasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "subtasks_modify_nv" ON public.subtasks FOR ALL TO authenticated 
  USING (NOT public.has_role(auth.uid(), 'visualizador')) WITH CHECK (NOT public.has_role(auth.uid(), 'visualizador'));

-- Comments
CREATE POLICY "comments_select_auth" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "comments_insert_own_nv" ON public.comments FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = author_id AND NOT public.has_role(auth.uid(), 'visualizador'));
CREATE POLICY "comments_update_own" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "comments_delete_own_or_admin" ON public.comments FOR DELETE TO authenticated 
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

-- Attachments
CREATE POLICY "attachments_select_auth" ON public.attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "attachments_insert_nv" ON public.attachments FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = uploader_id AND NOT public.has_role(auth.uid(), 'visualizador'));
CREATE POLICY "attachments_delete_own_or_admin" ON public.attachments FOR DELETE TO authenticated 
  USING (auth.uid() = uploader_id OR public.has_role(auth.uid(), 'admin'));

-- Activity log
CREATE POLICY "activity_select_auth" ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "activity_insert_own" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true) ON CONFLICT DO NOTHING;

CREATE POLICY "attachments_storage_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'attachments');
CREATE POLICY "attachments_storage_insert" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "attachments_storage_delete" ON storage.objects FOR DELETE TO authenticated 
  USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Indexes
CREATE INDEX idx_projects_company ON public.projects(company_id);
CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_comments_project ON public.comments(project_id);
CREATE INDEX idx_comments_task ON public.comments(task_id);
