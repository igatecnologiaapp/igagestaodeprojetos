import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/usuarios")({
  component: UsersPage,
});

function UsersPage() {
  const { role } = useAuth();
  const qc = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleMap = new Map<string, string>();
      (roles.data ?? []).forEach((r) => roleMap.set(r.user_id, r.role));
      return (profiles.data ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "colaborador" }));
    },
  });

  const update = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Permissão atualizada"); qc.invalidateQueries({ queryKey: ["all-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (role !== "admin") {
    return <div className="p-8 text-center text-muted-foreground">Acesso restrito a administradores.</div>;
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1000px] mx-auto">
      <div>
        <h1 className="font-display text-3xl font-bold">Usuários e permissões</h1>
        <p className="text-sm text-muted-foreground">Defina o nível de acesso de cada usuário.</p>
      </div>

      <div className="grid gap-3">
        {users.map((u) => (
          <Card key={u.id}><CardContent className="p-4 flex items-center gap-4 flex-wrap">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary font-semibold">
              {(u.full_name ?? u.email ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{u.full_name ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{u.email}</div>
            </div>
            <Badge variant="outline" className="capitalize">{u.role}</Badge>
            <Select value={u.role} onValueChange={(v) => update.mutate({ userId: u.id, newRole: v })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="colaborador">Colaborador</SelectItem>
                <SelectItem value="visualizador">Visualizador</SelectItem>
              </SelectContent>
            </Select>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
