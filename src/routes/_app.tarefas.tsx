import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TASK_PRIORITY, TASK_STATUS, fmtDate, isOverdue } from "@/lib/format";
import { Search, ListChecks, AlertTriangle, Calendar } from "lucide-react";

export const Route = createFileRoute("/_app/tarefas")({
  component: TasksPage,
});

function TasksPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");

  const { data: tasks = [] } = useQuery({
    queryKey: ["all-tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*, projects(id, name), profiles:assignee_id(full_name)")
        .order("due_date", { ascending: true, nullsFirst: false });
      return data ?? [];
    },
  });

  const filtered = tasks.filter((t: any) => {
    if (status !== "all" && t.status !== status) return false;
    if (priority !== "all" && t.priority !== priority) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="font-display text-3xl font-bold">Todas as tarefas</h1>
        <p className="text-sm text-muted-foreground">Visão consolidada de todas as tarefas dos projetos.</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar tarefa…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(TASK_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas prioridades</SelectItem>
            {Object.entries(TASK_PRIORITY).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-40" />
          Nenhuma tarefa encontrada.
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((t: any) => {
            const overdue = isOverdue(t.due_date, t.status);
            return (
              <Link key={t.id} to="/projetos/$projectId" params={{ projectId: t.project_id }}>
                <Card className="hover:shadow transition">
                  <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.projects?.name}{t.profiles?.full_name && ` · ${t.profiles.full_name}`}</div>
                    </div>
                    <Badge className={TASK_PRIORITY[t.priority as keyof typeof TASK_PRIORITY].color}>
                      {TASK_PRIORITY[t.priority as keyof typeof TASK_PRIORITY].label}
                    </Badge>
                    <Badge className={TASK_STATUS[t.status as keyof typeof TASK_STATUS].color}>
                      {TASK_STATUS[t.status as keyof typeof TASK_STATUS].label}
                    </Badge>
                    {t.due_date && (
                      <span className={`text-xs flex items-center gap-1 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {overdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                        {fmtDate(t.due_date)}
                      </span>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
