import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Building2, FolderKanban, ListChecks, BarChart3, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", label: "Início", icon: LayoutDashboard },
  { to: "/empresas", label: "Empresas", icon: Building2 },
  { to: "/projetos", label: "Projetos", icon: FolderKanban },
  { to: "/tarefas", label: "Tarefas", icon: ListChecks },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/usuarios", label: "Usuários", icon: Users, adminOnly: true },
];

export function MobileNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { role } = useAuth();
  const visible = items.filter((i) => !i.adminOnly || role === "admin").slice(0, 5);
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card flex">
      {visible.map((it) => {
        const active = path === it.to || path.startsWith(it.to + "/");
        const Icon = it.icon;
        return (
          <Link
            key={it.to}
            to={it.to}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2 text-[10px]",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
