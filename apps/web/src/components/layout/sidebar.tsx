import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  KanbanSquare,
  LayoutDashboard,
  ListTodo,
  ScrollText,
  Tags,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { PERMISSIONS, type PermissionKey } from '@eop/shared';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  permission?: PermissionKey;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/work', label: 'Work', icon: ListTodo, permission: PERMISSIONS.WORKITEM_READ },
  { to: '/sprints', label: 'Sprints', icon: KanbanSquare, permission: PERMISSIONS.SPRINT_READ },
  { to: '/insights', label: 'Insights', icon: BarChart3, permission: PERMISSIONS.ANALYTICS_READ },
  { to: '/labels', label: 'Labels', icon: Tags, permission: PERMISSIONS.LABEL_READ },
  { to: '/users', label: 'Users', icon: Users, permission: PERMISSIONS.USER_READ },
  { to: '/audit', label: 'Audit Log', icon: ScrollText, permission: PERMISSIONS.AUDIT_READ },
];

export function Sidebar() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const items = NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Boxes className="h-5 w-5" />
        </div>
        <span className="font-semibold tracking-tight">EOP</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">Phase 5 · Analytics</div>
    </aside>
  );
}
