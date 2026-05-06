import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TASK_PRIORITY, TASK_STATUS, fmtDate, isOverdue } from "@/lib/format";
import { Calendar, User, AlertTriangle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const COLUMNS: { key: keyof typeof TASK_STATUS; label: string }[] = [
  { key: "nao_iniciada", label: "Não iniciada" },
  { key: "em_andamento", label: "Em andamento" },
  { key: "concluida", label: "Concluída" },
];

export function Kanban({ tasks, onEdit }: { tasks: any[]; onEdit?: (t: any) => void }) {
  const qc = useQueryClient();
  const { role } = useAuth();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [active, setActive] = useState<any>(null);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-tasks"] });
      qc.invalidateQueries({ queryKey: ["all-tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const onDragStart = (e: DragStartEvent) => setActive(tasks.find((t) => t.id === e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActive(null);
    if (!e.over || role === "visualizador") return;
    const newStatus = e.over.id as string;
    const task = tasks.find((t) => t.id === e.active.id);
    if (task && task.status !== newStatus) updateStatus.mutate({ id: task.id, status: newStatus });
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return <Column key={col.key} id={col.key} label={col.label} tasks={colTasks} onEdit={onEdit} />;
        })}
      </div>
      <DragOverlay>{active && <TaskCard task={active} dragging />}</DragOverlay>
    </DndContext>
  );
}

function Column({ id, label, tasks, onEdit }: { id: string; label: string; tasks: any[]; onEdit?: (t: any) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`rounded-xl bg-muted/40 p-3 min-h-[300px] transition ${isOver ? "ring-2 ring-primary" : ""}`}>
      <div className="flex items-center justify-between px-2 mb-3">
        <div className="font-display font-semibold text-sm">{label}</div>
        <Badge variant="outline" className="text-xs">{tasks.length}</Badge>
      </div>
      <div className="space-y-2">
        {tasks.map((t) => <DraggableTask key={t.id} task={t} onEdit={onEdit} />)}
        {tasks.length === 0 && <div className="text-center text-xs text-muted-foreground py-8">Sem tarefas</div>}
      </div>
    </div>
  );
}

function DraggableTask({ task, onEdit }: { task: any; onEdit?: (t: any) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={{ opacity: isDragging ? 0.4 : 1 }}>
      <TaskCard task={task} onEdit={onEdit} />
    </div>
  );
}

function TaskCard({ task, onEdit, dragging }: { task: any; onEdit?: (t: any) => void; dragging?: boolean }) {
  const overdue = isOverdue(task.due_date, task.status);
  return (
    <Card className={`p-3 cursor-grab active:cursor-grabbing space-y-2 ${dragging ? "shadow-xl rotate-2" : "hover:shadow"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm leading-tight">{task.name}</div>
        {onEdit && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {task.description && <div className="text-xs text-muted-foreground line-clamp-2">{task.description}</div>}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={`${TASK_PRIORITY[task.priority as keyof typeof TASK_PRIORITY].color} text-[10px]`}>
          {TASK_PRIORITY[task.priority as keyof typeof TASK_PRIORITY].label}
        </Badge>
        {task.due_date && (
          <span className={`text-[10px] flex items-center gap-1 ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
            {overdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
            {fmtDate(task.due_date)}
          </span>
        )}
        {task.profiles?.full_name && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
            <User className="h-3 w-3" />{(task.profiles.full_name as string).split(" ")[0]}
          </span>
        )}
      </div>
    </Card>
  );
}
