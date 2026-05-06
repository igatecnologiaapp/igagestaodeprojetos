import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Kind = "project" | "task";

export function ShareDialog({
  open, onOpenChange, kind, entityId,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  kind: Kind;
  entityId: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const table = kind === "project" ? "project_shares" : "task_shares";
  const fk = kind === "project" ? "project_id" : "task_id";
  const key = ["shares", kind, entityId];

  const [userId, setUserId] = useState<string>("");
  const [perm, setPerm] = useState<"view" | "edit">("view");

  const { data: users = [] } = useQuery({
    queryKey: ["users-options"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email").order("full_name");
      return data ?? [];
    },
  });

  const { data: shares = [] } = useQuery({
    queryKey: key,
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from(table as any)
        .select("id, user_id, permission, profiles:user_id(full_name, email)")
        .eq(fk, entityId);
      return (data as any[]) ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Selecione um usuário");
      const payload: any = { [fk]: entityId, user_id: userId, permission: perm, created_by: user?.id };
      const { error } = await supabase.from(table as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { setUserId(""); qc.invalidateQueries({ queryKey: key }); toast.success("Compartilhado!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: any) => toast.error(e.message),
  });

  const sharedIds = new Set(shares.map((s: any) => s.user_id));
  const available = users.filter((u: any) => !sharedIds.has(u.id) && u.id !== user?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Share2 className="h-4 w-4" /> Compartilhar</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Selecionar usuário…" /></SelectTrigger>
              <SelectContent>
                {available.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={perm} onValueChange={(v) => setPerm(v as any)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="view">Visualizar</SelectItem>
                <SelectItem value="edit">Editar</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => add.mutate()} disabled={add.isPending || !userId}>Adicionar</Button>
          </div>
          <div className="space-y-2">
            {shares.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">Ninguém com acesso compartilhado ainda.</div>
            ) : shares.map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 p-2 rounded-md border">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.profiles?.full_name ?? s.profiles?.email}</div>
                  <div className="text-xs text-muted-foreground capitalize">{s.permission === "edit" ? "Editar" : "Visualizar"}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(s.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
