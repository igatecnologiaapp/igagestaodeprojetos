import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FolderKanban, ListChecks, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PROJECT_STATUS, TASK_STATUS, TASK_PRIORITY, isOverdue, fmtDate } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [companies, projects, tasks] = await Promise.all([
        supabase.from("companies").select("id, status"),
        supabase.from("projects").select("id, name, status, end_date"),
        supabase.from("tasks").select("id, name, status, priority, due_date, project_id, assignee_id"),
      ]);
      return {
        companies: companies.data ?? [],
        projects: projects.data ?? [],
        tasks: tasks.data ?? [],
      };
    },
  });

  const projects = data?.projects ?? [];
  const tasks = data?.tasks ?? [];

  const projStatusCount = Object.keys(PROJECT_STATUS).map((s) => ({
    name: PROJECT_STATUS[s as keyof typeof PROJECT_STATUS].label,
    value: projects.filter((p) => p.status === s).length,
    key: s,
  }));

  const taskStatusCount = Object.keys(TASK_STATUS).map((s) => ({
    name: TASK_STATUS[s as keyof typeof TASK_STATUS].label,
    value: tasks.filter((t) => t.status === s).length,
  }));

  const overdueTasks = tasks.filter((t) => isOverdue(t.due_date, t.status));
  const overdueProjects = projects.filter(
    (p) => p.end_date && p.status !== "concluido" && p.status !== "cancelado" && new Date(p.end_date) < new Date()
  );

  const colors = ["hsl(258 80% 60%)", "hsl(155 60% 50%)", "hsl(75 80% 55%)", "hsl(25 80% 55%)", "hsl(230 70% 60%)"];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral da operação.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="Empresas ativas" value={data?.companies.filter((c) => c.status === "ativa").length ?? 0} />
        <StatCard icon={FolderKanban} label="Projetos ativos" value={projects.filter((p) => p.status === "em_andamento").length} />
        <StatCard icon={ListChecks} label="Tarefas em aberto" value={tasks.filter((t) => t.status !== "concluida").length} />
        <StatCard icon={AlertTriangle} label="Tarefas atrasadas" value={overdueTasks.length} tone="destructive" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Projetos por status</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projStatusCount}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.012 252)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {projStatusCount.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Tarefas por status</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={taskStatusCount} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                  {taskStatusCount.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Projetos próximos do prazo</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {projects.length === 0 && <Empty text="Nenhum projeto cadastrado." />}
            {projects
              .filter((p) => p.end_date && p.status !== "concluido" && p.status !== "cancelado")
              .sort((a, b) => (a.end_date! > b.end_date! ? 1 : -1))
              .slice(0, 5)
              .map((p) => (
                <Link key={p.id} to="/projetos/$projectId" params={{ projectId: p.id }} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent transition">
                  <div>
                    <div className="font-medium text-sm">{p.name}</div>
                    <div className="text-xs text-muted-foreground">Prazo: {fmtDate(p.end_date)}</div>
                  </div>
                  <Badge className={PROJECT_STATUS[p.status as keyof typeof PROJECT_STATUS].color}>
                    {PROJECT_STATUS[p.status as keyof typeof PROJECT_STATUS].label}
                  </Badge>
                </Link>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Tarefas atrasadas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {overdueTasks.length === 0 && <Empty text="Sem atrasos. ✨" />}
            {overdueTasks.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">Prazo: {fmtDate(t.due_date)}</div>
                </div>
                <Badge className={TASK_PRIORITY[t.priority as keyof typeof TASK_PRIORITY].color}>
                  {TASK_PRIORITY[t.priority as keyof typeof TASK_PRIORITY].label}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone?: "destructive" }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`grid h-12 w-12 place-items-center rounded-xl ${tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-2xl font-display font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-6 text-sm text-muted-foreground flex flex-col items-center gap-2">
      <CheckCircle2 className="h-6 w-6 text-success" /> {text}
    </div>
  );
}
