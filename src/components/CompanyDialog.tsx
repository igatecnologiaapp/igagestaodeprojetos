import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { maskCEP, maskCNPJ, maskPhone } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export type Company = {
  id?: string;
  name: string;
  cnpj?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  zip_code?: string | null;
  city?: string | null;
  state?: string | null;
  status?: "ativa" | "inativa";
};

export function CompanyDialog({
  open,
  onOpenChange,
  company,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  company?: Company | null;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<Company>(
    company ?? { name: "", status: "ativa" }
  );

  const upsert = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nome obrigatório");
      const payload = { ...form, created_by: user?.id };
      const { error } = company?.id
        ? await supabase.from("companies").update(payload).eq("id", company.id)
        : await supabase.from("companies").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empresa salva!");
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = <K extends keyof Company>(k: K, v: Company[K]) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{company?.id ? "Editar empresa" : "Nova empresa"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome da empresa *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label>CNPJ</Label>
            <Input value={form.cnpj ?? ""} onChange={(e) => set("cnpj", maskCNPJ(e.target.value))} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="inativa">Inativa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nome do contato</Label>
            <Input value={form.contact_name ?? ""} onChange={(e) => set("contact_name", e.target.value)} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={form.contact_phone ?? ""} onChange={(e) => set("contact_phone", maskPhone(e.target.value))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Email</Label>
            <Input type="email" value={form.contact_email ?? ""} onChange={(e) => set("contact_email", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Endereço</Label>
            <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div>
            <Label>Bairro</Label>
            <Input value={form.neighborhood ?? ""} onChange={(e) => set("neighborhood", e.target.value)} />
          </div>
          <div>
            <Label>CEP</Label>
            <Input value={form.zip_code ?? ""} onChange={(e) => set("zip_code", maskCEP(e.target.value))} />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <Label>UF</Label>
            <Input maxLength={2} value={form.state ?? ""} onChange={(e) => set("state", e.target.value.toUpperCase())} />
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

export function useCompanies(search?: string, status?: string) {
  return useQuery({
    queryKey: ["companies", search, status],
    queryFn: async () => {
      let q = supabase.from("companies").select("*").order("name");
      if (search) q = q.ilike("name", `%${search}%`);
      if (status && status !== "all") q = q.eq("status", status as any);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}
