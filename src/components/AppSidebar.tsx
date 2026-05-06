import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Building2, FolderKanban, ListChecks, Users, BarChart3, LogOut, Sparkles, CalendarClock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/empresas", label: "Empresas", icon: Building2 },
  { to: "/projetos", label: "Projetos", icon: FolderKanban },
  { to: "/tarefas", label: "Tarefas", icon: ListChecks },
  { to: "/agenda", label: "Agenda", icon: CalendarClock },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/usuarios", label: "Usuários", icon: Users, adminOnly: true },
];

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, role, signOut } = useAuth();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="font-display text-lg font-bold leading-none">Flowdesk</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Gestão de projetos</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items
          .filter((i) => !i.adminOnly || role === "admin")
          .map((item) => {
            const active = path === item.to || path.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
            {(user?.email ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{user?.email}</div>
            <div className="text-[11px] text-muted-foreground capitalize">{role ?? "—"}</div>
          </div>
          <button
            onClick={() => signOut()}
            className="rounded-md p-2 text-muted-foreground hover:bg-sidebar-accent"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
