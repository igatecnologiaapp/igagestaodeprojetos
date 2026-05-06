import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderKanban, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PROJECT_STATUS, brl, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_app/empresas/$companyId")({
  component: CompanyDetail,
});

function CompanyDetail() {
  const { companyId } = Route.useParams();

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
    </div>
  );
}
