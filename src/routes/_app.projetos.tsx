import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, Pencil, Trash2, FolderKanban, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectDialog } from "@/components/ProjectDialog";
import { PROJECT_STATUS, brl, fmtDate, isOverdue } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/projetos")({
  validateSearch: (s: Record<string, unknown>) => ({ companyId: (s.companyId as string) || undefined }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { companyId } = Route.useSearch();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const { role } = useAuth();
  const qc = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ["projects", search, status],
    queryFn: async () => {
      let q = supabase.from("projects").select("*, companies(name), tasks(id, status)").order("created_at", { ascending: false });
      if (search) q = q.ilike("name", `%${search}%`);
      if (status !== "all") q = q.eq("status", status as any);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Projeto excluído");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Projetos</h1>
          <p className="text-sm text-muted-foreground">Acompanhe todos os projetos da operação.</p>
        </div>
        {role !== "visualizador" && (
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Novo projeto
          </Button>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar projeto…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(PROJECT_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p: any) => {
            const tasks = p.tasks ?? [];
            const done = tasks.filter((t: any) => t.status === "concluida").length;
            const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
            const overdue = isOverdue(p.end_date, p.status);
            return (
              <Card key={p.id} className="hover:shadow-md transition">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link to="/projetos/$projectId" params={{ projectId: p.id }} className="font-display font-semibold text-lg hover:text-primary block truncate">
                        {p.name}
                      </Link>
                      <div className="text-xs text-muted-foreground truncate">{p.companies?.name}</div>
                    </div>
                    <Badge className={PROJECT_STATUS[p.status as keyof typeof PROJECT_STATUS].color}>
                      {PROJECT_STATUS[p.status as keyof typeof PROJECT_STATUS].label}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progresso</span><span>{progress}% · {done}/{tasks.length}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{brl(p.value)}</span>
                    <span className={overdue ? "text-destructive font-medium flex items-center gap-1" : ""}>
                      {overdue && <AlertTriangle className="h-3 w-3" />}
                      Prazo: {fmtDate(p.end_date)}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-border">
                    <Link to="/projetos/$projectId" params={{ projectId: p.id }} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">Abrir</Button>
                    </Link>
                    {role !== "visualizador" && (
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {role === "admin" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
                            <AlertDialogDescription>Todas as tarefas vinculadas serão removidas.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => del.mutate(p.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-40" />
          Nenhum projeto encontrado.
        </CardContent></Card>
      )}

      <ProjectDialog open={open} onOpenChange={setOpen} project={editing} defaultCompanyId={companyId} />
    </div>
  );
}
