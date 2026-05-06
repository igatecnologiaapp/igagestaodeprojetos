export const brl = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR") : "—";

export const maskPhone = (v: string) => {
  const x = v.replace(/\D/g, "").slice(0, 11);
  if (x.length <= 10)
    return x.replace(/(\d{2})(\d{4})(\d{0,4}).*/, (_, a, b, c) =>
      c ? `(${a}) ${b}-${c}` : b ? `(${a}) ${b}` : a ? `(${a}` : ""
    );
  return x.replace(/(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
};

export const maskCNPJ = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");

export const maskCEP = (v: string) =>
  v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");

export const PROJECT_STATUS = {
  planejamento: { label: "Planejamento", color: "bg-info/15 text-info" },
  em_andamento: { label: "Em andamento", color: "bg-primary/15 text-primary" },
  pausado: { label: "Pausado", color: "bg-warning/20 text-warning-foreground" },
  concluido: { label: "Concluído", color: "bg-success/15 text-success" },
  cancelado: { label: "Cancelado", color: "bg-destructive/15 text-destructive" },
} as const;

export const TASK_STATUS = {
  nao_iniciada: { label: "Não iniciada", color: "bg-muted text-muted-foreground" },
  em_andamento: { label: "Em andamento", color: "bg-info/15 text-info" },
  concluida: { label: "Concluída", color: "bg-success/15 text-success" },
} as const;

export const TASK_PRIORITY = {
  baixa: { label: "Baixa", color: "bg-muted text-muted-foreground" },
  media: { label: "Média", color: "bg-info/15 text-info" },
  alta: { label: "Alta", color: "bg-warning/20 text-warning-foreground" },
  urgente: { label: "Urgente", color: "bg-destructive/15 text-destructive" },
} as const;

export const isOverdue = (due: string | null | undefined, status: string) =>
  due && status !== "concluida" && new Date(due) < new Date(new Date().toDateString());
