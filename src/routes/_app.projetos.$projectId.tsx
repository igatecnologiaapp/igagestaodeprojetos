import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { ArrowLeft, Plus, Calendar, MessageSquare, Send, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Kanban } from "@/components/Kanban";
import { TaskDialog } from "@/components/TaskDialog";
import { ShareDialog } from "@/components/ShareDialog";
import { PROJECT_STATUS, brl, fmtDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/projetos/$projectId")({
  component: ProjectDetail,
});

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [taskOpen, setTaskOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [comment, setComment] = useState("");

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*, companies(id, name)").eq("id", projectId).maybeSingle();
      return data;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*, profiles:assignee_id(full_name)")
        .eq("project_id", projectId)
        .order("created_at");
      return data ?? [];
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["project-comments", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("*, profiles:author_id(full_name, email)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!comment.trim() || !user) return;
      const { error } = await supabase.from("comments").insert({
        project_id: projectId, author_id: user.id, body: comment,
      });
      if (error) throw error;
    },
    onSuccess: () => { setComment(""); qc.invalidateQueries({ queryKey: ["project-comments", projectId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!project) return <div className="p-8">Carregando…</div>;

  const done = tasks.filter((t) => t.status === "concluida").length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const status = PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      <Link to="/projetos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar para projetos
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Badge className={status.color}>{status.label}</Badge>
          <h1 className="font-display text-3xl font-bold mt-2">{project.name}</h1>
          <Link to="/empresas/$companyId" params={{ companyId: project.companies?.id }} className="text-sm text-muted-foreground hover:underline">
            {project.companies?.name}
          </Link>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShareOpen(true)}>
            <Share2 className="h-4 w-4" /> Compartilhar
          </Button>
          {role !== "visualizador" && (
            <Button onClick={() => { setEditingTask(null); setTaskOpen(true); }}>
              <Plus className="h-4 w-4" /> Nova tarefa
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Valor</div>
          <div className="font-display text-xl font-bold">{brl(project.value)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Início</div>
          <div className="font-display text-xl font-bold flex items-center gap-2"><Calendar className="h-4 w-4" />{fmtDate(project.start_date)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Prazo</div>
          <div className="font-display text-xl font-bold flex items-center gap-2"><Calendar className="h-4 w-4" />{fmtDate(project.end_date)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Progresso</div>
          <div className="font-display text-xl font-bold">{progress}%</div>
          <Progress value={progress} className="h-2 mt-2" />
        </CardContent></Card>
      </div>

      {project.description && (
        <Card><CardContent className="p-5">
          <div className="text-xs text-muted-foreground mb-2">Descrição</div>
          <div className="text-sm whitespace-pre-wrap">{project.description}</div>
        </CardContent></Card>
      )}

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="comments">Comentários ({comments.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="kanban" className="mt-4">
          <Kanban tasks={tasks} onEdit={(t) => { setEditingTask(t); setTaskOpen(true); }} />
        </TabsContent>
        <TabsContent value="comments" className="mt-4 space-y-4">
          {role !== "visualizador" && (
            <Card><CardContent className="p-4 space-y-3">
              <Textarea placeholder="Escrever um comentário…" value={comment} onChange={(e) => setComment(e.target.value)} />
              <div className="flex justify-end">
                <Button size="sm" onClick={() => addComment.mutate()} disabled={!comment.trim() || addComment.isPending}>
                  <Send className="h-4 w-4" /> Enviar
                </Button>
              </div>
            </CardContent></Card>
          )}
          {comments.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8 flex flex-col items-center gap-2">
              <MessageSquare className="h-6 w-6 opacity-40" /> Nenhum comentário ainda.
            </div>
          ) : comments.map((c: any) => (
            <Card key={c.id}><CardContent className="p-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-foreground">{c.profiles?.full_name ?? c.profiles?.email}</span>
                <span>{new Date(c.created_at).toLocaleString("pt-BR")}</span>
              </div>
              <div className="text-sm whitespace-pre-wrap">{c.body}</div>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>

      <TaskDialog open={taskOpen} onOpenChange={setTaskOpen} task={editingTask} projectId={projectId} />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} kind="project" entityId={projectId} />
    </div>
  );
}
