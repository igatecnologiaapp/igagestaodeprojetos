import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderKanban, Plus, ListChecks, Calendar, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PROJECT_STATUS, TASK_PRIORITY, TASK_STATUS, brl, fmtDate, fmtDateTime, isOverdue } from "@/lib/format";
import { useState } from "react";
import { TaskDialog, type Task } from "@/components/TaskDialog";

export const Route = createFileRoute("/_app/empresas/$companyId")({
  component: CompanyDetail,
});

function CompanyDetail() {
  const { companyId } = Route.useParams();
  const [taskOpen, setTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { data } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const [c, p] = await Promise.all([
        supabase.from("companies").select("*").eq("id", companyId).maybeSingle(),
        supabase.from("projects").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
      ]);
      return { company: c.data, projects: p.data ?? [] };
    },
  });

  const projectIds = (data?.projects ?? []).map((p) => p.id);

  const { data: tasks = [] } = useQuery({
    queryKey: ["company-tasks", companyId, projectIds.join(",")],
    enabled: projectIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*, projects(id, name), profiles:assignee_id(full_name)")
        .in("project_id", projectIds)
        .order("scheduled_at", { ascending: true, nullsFirst: false });
      return data ?? [];
    },
  });

  if (!data?.company) return <div className="p-8">Carregando…</div>;
  const c = data.company;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1200px] mx-auto">
      <Link to="/empresas" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div>
        <h1 className="font-display text-3xl font-bold">{c.name}</h1>
        <div className="text-sm text-muted-foreground">{c.cnpj}</div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5">
          <div className="text-xs text-muted-foreground mb-1">Contato</div>
          <div className="font-medium">{c.contact_name ?? "—"}</div>
          <div className="text-sm text-muted-foreground">{c.contact_phone}</div>
          <div className="text-sm text-muted-foreground">{c.contact_email}</div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="text-xs text-muted-foreground mb-1">Endereço</div>
          <div className="text-sm">{c.address ?? "—"}</div>
          <div className="text-sm text-muted-foreground">{c.neighborhood}{c.neighborhood && c.zip_code ? " · " : ""}{c.zip_code}</div>
          <div className="text-sm text-muted-foreground">{c.city}{c.state ? ` - ${c.state}` : ""}</div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="text-xs text-muted-foreground mb-1">Status</div>
          <Badge className={c.status === "ativa" ? "bg-success/15 text-success" : "bg-muted"}>{c.status}</Badge>
          <div className="mt-2 text-sm text-muted-foreground">{data.projects.length} projeto(s)</div>
        </CardContent></Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Projetos</h2>
        <Link to="/projetos" search={{ companyId } as any}>
          <Button size="sm" variant="outline"><Plus className="h-4 w-4" /> Novo projeto</Button>
        </Link>
      </div>

      {data.projects.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <FolderKanban className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Nenhum projeto cadastrado para esta empresa.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {data.projects.map((p) => (
            <Link key={p.id} to="/projetos/$projectId" params={{ projectId: p.id }}>
              <Card className="hover:shadow-md transition">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(p.start_date)} → {fmtDate(p.end_date)} · {brl(p.value)}</div>
                  </div>
                  <Badge className={PROJECT_STATUS[p.status as keyof typeof PROJECT_STATUS].color}>
                    {PROJECT_STATUS[p.status as keyof typeof PROJECT_STATUS].label}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <h2 className="font-display text-xl font-bold">Tarefas da empresa</h2>
        <Button
          size="sm"
          onClick={() => { setEditingTask(null); setTaskOpen(true); }}
          disabled={data.projects.length === 0}
        >
          <Plus className="h-4 w-4" /> Nova tarefa
        </Button>
      </div>

      {data.projects.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Cadastre um projeto antes de criar tarefas.
        </CardContent></Card>
      ) : tasks.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Nenhuma tarefa para esta empresa.
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {tasks.map((t: any) => {
            const overdue = isOverdue(t.due_date, t.status);
            return (
              <Card key={t.id} className="hover:shadow transition cursor-pointer" onClick={() => { setEditingTask(t); setTaskOpen(true); }}>
                <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.projects?.name}
                      {t.profiles?.full_name && ` · ${t.profiles.full_name}`}
                      {t.contact_name && ` · ${t.contact_name}`}
                      {t.contact_phone && ` · ${t.contact_phone}`}
                    </div>
                  </div>
                  <Badge className={TASK_PRIORITY[t.priority as keyof typeof TASK_PRIORITY].color}>
                    {TASK_PRIORITY[t.priority as keyof typeof TASK_PRIORITY].label}
                  </Badge>
                  <Badge className={TASK_STATUS[t.status as keyof typeof TASK_STATUS].color}>
                    {TASK_STATUS[t.status as keyof typeof TASK_STATUS].label}
                  </Badge>
                  {t.scheduled_at && (
                    <span className="text-xs flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" /> {fmtDateTime(t.scheduled_at)}
                    </span>
                  )}
                  {t.due_date && (
                    <span className={`text-xs flex items-center gap-1 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {overdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                      {fmtDate(t.due_date)}
                    </span>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {taskOpen && (
        <TaskDialog
          open={taskOpen}
          onOpenChange={setTaskOpen}
          task={editingTask ?? undefined}
          companyId={companyId}
          projectId={editingTask?.project_id}
        />
      )}
    </div>
  );
}
