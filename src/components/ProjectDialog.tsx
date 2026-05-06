import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { PROJECT_STATUS } from "@/lib/format";

export type Project = {
  id?: string;
  name: string;
  company_id: string;
  description?: string | null;
  value?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: keyof typeof PROJECT_STATUS;
};

export function ProjectDialog({
  open, onOpenChange, project, defaultCompanyId,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  project?: Project | null;
  defaultCompanyId?: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<Project>(
    project ?? { name: "", company_id: defaultCompanyId ?? "", status: "planejamento", value: 0 }
  );

  const { data: companies } = useQuery({
    queryKey: ["companies-options"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name").order("name");
      return data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nome obrigatório");
      if (!form.company_id) throw new Error("Selecione uma empresa");
      const payload = { ...form, created_by: user?.id, value: Number(form.value) || 0 };
      const { error } = project?.id
        ? await supabase.from("projects").update(payload).eq("id", project.id)
        : await supabase.from("projects").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Projeto salvo!");
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["company"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = <K extends keyof Project>(k: K, v: Project[K]) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project?.id ? "Editar projeto" : "Novo projeto"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome do projeto *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Empresa *</Label>
            <Select value={form.company_id} onValueChange={(v) => set("company_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {companies?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <Textarea rows={4} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" value={form.value ?? 0} onChange={(e) => set("value", Number(e.target.value))} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Início</Label>
            <Input type="date" value={form.start_date ?? ""} onChange={(e) => set("start_date", e.target.value || null)} />
          </div>
          <div>
            <Label>Prazo final</Label>
            <Input type="date" value={form.end_date ?? ""} onChange={(e) => set("end_date", e.target.value || null)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => upsert.mutate()} disabled={upsert.isPending}>
            {upsert.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
