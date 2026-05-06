
-- Fix permission denied: grant execute on has_role
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, anon;

-- Appointments / Agenda de compromissos
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  scheduled_at timestamptz NOT NULL,
  reminder_at timestamptz,
  status text NOT NULL DEFAULT 'pendente',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_company ON public.appointments(company_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON public.appointments(scheduled_at);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_select_auth" ON public.appointments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "appointments_insert_nv" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (NOT public.has_role(auth.uid(), 'visualizador'::public.app_role));

CREATE POLICY "appointments_update_nv" ON public.appointments
  FOR UPDATE TO authenticated
  USING (NOT public.has_role(auth.uid(), 'visualizador'::public.app_role));

CREATE POLICY "appointments_delete_admin" ON public.appointments
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER appointments_set_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
