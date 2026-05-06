import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PROJECT_STATUS, TASK_STATUS, brl } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

export const Route = createFileRoute("/_app/relatorios")({
  component: ReportsPage,
});

function ReportsPage() {
  const { data } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const [companies, projects, tasks, profiles] = await Promise.all([
        supabase.from("companies").select("*"),
        supabase.from("projects").select("*, companies(name)"),
        supabase.from("tasks").select("*, profiles:assignee_id(full_name)"),
        supabase.from("profiles").select("id, full_name"),
      ]);
      return { companies: companies.data ?? [], projects: projects.data ?? [], tasks: tasks.data ?? [], profiles: profiles.data ?? [] };
    },
  });

  const projects = data?.projects ?? [];
  const tasks = data?.tasks ?? [];

  const byCompany = (data?.companies ?? []).map((c) => {
    const ps = projects.filter((p: any) => p.company_id === c.id);
    return {
      name: c.name,
      projetos: ps.length,
      valor: ps.reduce((s: number, p: any) => s + Number(p.value || 0), 0),
    };
  }).filter((x) => x.projetos > 0);

  const byUser = (data?.profiles ?? []).map((u) => ({
    name: u.full_name ?? "—",
    total: tasks.filter((t: any) => t.assignee_id === u.id).length,
    concluidas: tasks.filter((t: any) => t.assignee_id === u.id && t.status === "concluida").length,
  })).filter((x) => x.total > 0);

  const colors = ["hsl(258 80% 60%)", "hsl(155 60% 50%)", "hsl(75 80% 55%)", "hsl(25 80% 55%)", "hsl(230 70% 60%)"];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="font-display text-3xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Indicadores e desempenho.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Projetos por empresa</CardTitle></CardHeader>
          <CardContent className="h-72">
            {byCompany.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCompany}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.012 252)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="projetos" radius={[6, 6, 0, 0]}>
                    {byCompany.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Tarefas por responsável</CardTitle></CardHeader>
          <CardContent className="h-72">
            {byUser.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byUser}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.012 252)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(258 80% 60%)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="concluidas" fill="hsl(155 60% 50%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Resumo financeiro por projeto</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr><th className="text-left py-2">Projeto</th><th className="text-left">Empresa</th><th className="text-left">Status</th><th className="text-right">Valor</th></tr>
              </thead>
              <tbody>
                {projects.map((p: any) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="py-2 font-medium">{p.name}</td>
                    <td className="text-muted-foreground">{p.companies?.name}</td>
                    <td><Badge className={PROJECT_STATUS[p.status as keyof typeof PROJECT_STATUS].color}>{PROJECT_STATUS[p.status as keyof typeof PROJECT_STATUS].label}</Badge></td>
                    <td className="text-right font-medium">{brl(p.value)}</td>
                  </tr>
                ))}
                {projects.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Sem projetos.</td></tr>}
                {projects.length > 0 && (
                  <tr className="font-display font-bold">
                    <td className="py-3" colSpan={3}>Total</td>
                    <td className="text-right">{brl(projects.reduce((s: number, p: any) => s + Number(p.value || 0), 0))}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Empty() {
  return <div className="h-full grid place-items-center text-sm text-muted-foreground">Sem dados.</div>;
}
