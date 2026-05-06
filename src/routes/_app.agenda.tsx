import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCompanies } from "@/components/CompanyDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CalendarClock, Plus, Bell, Building2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/agenda")({
  component: AgendaPage,
});

type Appointment = {
  id?: string;
  company_id: string;
  title: string;
  description?: string | null;
  scheduled_at: string;
  reminder_at?: string | null;
  status?: string;
};

const STATUS = [
  { v: "pendente", label: "Pendente" },
  { v: "concluido", label: "Concluído" },
  { v: "cancelado", label: "Cancelado" },
];

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AgendaPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const { data: companies = [] } = useCompanies();
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["appointments", companyFilter],
    queryFn: async () => {
      let q = supabase.from("appointments" as any).select("*").order("scheduled_at", { ascending: true });
      if (companyFilter !== "all") q = q.eq("company_id", companyFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const companyMap = useMemo(() => {
    const m = new Map<string, string>();
    companies.forEach((c: any) => m.set(c.id, c.name));
    return m;
  }, [companies]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Compromisso removido");
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const now = new Date();
  const canEdit = role !== "visualizador";

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold">Agenda de compromissos</h1>
          <p className="text-sm text-muted-foreground">Compromissos ordenados por data, com lembretes.</p>
        </div>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Novo compromisso
          </Button>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Filtrar por empresa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as empresas</SelectItem>
            {companies.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : data.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-40" />
          Nenhum compromisso agendado.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {data.map((a: any) => {
            const date = new Date(a.scheduled_at);
            const overdue = date < now && a.status === "pendente";
            const reminderDue = a.reminder_at && new Date(a.reminder_at) <= now && a.status === "pendente";
            return (
              <Card key={a.id} className="hover:shadow-md transition">
                <CardContent className="p-5 flex items-center gap-4 flex-wrap">
                  <div className={`grid h-12 w-12 place-items-center rounded-lg ${overdue ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-display font-semibold">{a.title}</div>
                      <Badge variant="outline" className="capitalize">{a.status}</Badge>
                      {reminderDue && (
                        <Badge className="bg-warning/15 text-warning gap-1"><Bell className="h-3 w-3" /> Lembrete</Badge>
                      )}
                      {overdue && <Badge className="bg-destructive/15 text-destructive">Atrasado</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {companyMap.get(a.company_id) ?? "—"}</span>
                      <span>📅 {date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                      {a.reminder_at && <span>🔔 {new Date(a.reminder_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>}
                    </div>
                    {a.description && <div className="text-sm text-muted-foreground mt-2">{a.description}</div>}
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(a); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {role === "admin" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir compromisso?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del.mutate(a.id)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AppointmentDialog
        open={open}
        onOpenChange={setOpen}
        appointment={editing}
        companies={companies}
        userId={user?.id}
      />
    </div>
  );
}

function AppointmentDialog({
  open, onOpenChange, appointment, companies, userId,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  appointment: Appointment | null;
  companies: any[];
  userId?: string;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Appointment>(
    appointment ?? { company_id: "", title: "", scheduled_at: "", reminder_at: "", status: "pendente" }
  );

  // reset when reopening
  useMemoReset(open, () => setForm(
    appointment ?? { company_id: "", title: "", scheduled_at: "", reminder_at: "", status: "pendente" }
  ));

  const save = useMutation({
    mutationFn: async () => {
      if (!form.company_id) throw new Error("Selecione uma empresa");
      if (!form.title.trim()) throw new Error("Informe o título");
      if (!form.scheduled_at) throw new Error("Informe a data agendada");
      const payload: any = {
        company_id: form.company_id,
        title: form.title,
        description: form.description || null,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        reminder_at: form.reminder_at ? new Date(form.reminder_at).toISOString() : null,
        status: form.status ?? "pendente",
        created_by: userId,
      };
      const { error } = appointment?.id
        ? await supabase.from("appointments" as any).update(payload).eq("id", appointment.id)
        : await supabase.from("appointments" as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Compromisso salvo");
      qc.invalidateQueries({ queryKey: ["appointments"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = <K extends keyof Appointment>(k: K, v: Appointment[K]) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{appointment?.id ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label>Empresa *</Label>
            <Select value={form.company_id} onValueChange={(v) => set("company_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {companies.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Data agendada *</Label>
              <Input type="datetime-local" value={toLocalInput(form.scheduled_at)} onChange={(e) => set("scheduled_at", e.target.value)} />
            </div>
            <div>
              <Label>Lembrete em</Label>
              <Input type="datetime-local" value={toLocalInput(form.reminder_at)} onChange={(e) => set("reminder_at", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea rows={3} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// small helper to reset form when dialog opens
import { useEffect } from "react";
function useMemoReset(open: boolean, fn: () => void) {
  useEffect(() => { if (open) fn(); /* eslint-disable-next-line */ }, [open]);
}
