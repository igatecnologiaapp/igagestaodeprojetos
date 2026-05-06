import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TASK_PRIORITY, TASK_STATUS, maskPhone } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export type Task = {
  id?: string;
  project_id: string;
  name: string;
  description?: string | null;
  assignee_id?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  priority?: keyof typeof TASK_PRIORITY;
  status?: keyof typeof TASK_STATUS;
  scheduled_at?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
};

export function TaskDialog({
  open, onOpenChange, task, projectId,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  task?: Task | null;
  projectId: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<Task>(
    task ?? { project_id: projectId, name: "", priority: "media", status: "nao_iniciada" }
  );

  const { data: users } = useQuery({
    queryKey: ["users-options"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email").order("full_name");
      return data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nome obrigatório");
      const payload = { ...form, project_id: projectId, created_by: user?.id };
      const { error } = task?.id
        ? await supabase.from("tasks").update(payload).eq("id", task.id)
        : await supabase.from("tasks").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarefa salva!");
      qc.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      qc.invalidateQueries({ queryKey: ["all-tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = <K extends keyof Task>(k: K, v: Task[K]) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task?.id ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <Textarea rows={3} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div>
            <Label>Responsável</Label>
            <Select value={form.assignee_id ?? "none"} onValueChange={(v) => set("assignee_id", v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem responsável</SelectItem>
                {users?.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select value={form.priority} onValueChange={(v) => set("priority", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TASK_PRIORITY).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Início</Label>
            <Input type="date" value={form.start_date ?? ""} onChange={(e) => set("start_date", e.target.value || null)} />
          </div>
          <div>
            <Label>Prazo</Label>
            <Input type="date" value={form.due_date ?? ""} onChange={(e) => set("due_date", e.target.value || null)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Data agendada</Label>
            <Input
              type="datetime-local"
              value={form.scheduled_at ? form.scheduled_at.slice(0, 16) : ""}
              onChange={(e) => set("scheduled_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
            />
          </div>
          <div>
            <Label>Contato da empresa</Label>
            <Input value={form.contact_name ?? ""} onChange={(e) => set("contact_name", e.target.value)} />
          </div>
          <div>
            <Label>Telefone do contato</Label>
            <Input value={form.contact_phone ?? ""} onChange={(e) => set("contact_phone", maskPhone(e.target.value))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TASK_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => upsert.mutate()} disabled={upsert.isPending}>{upsert.isPending ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
