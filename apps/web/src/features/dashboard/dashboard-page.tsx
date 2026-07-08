import { CalendarDays, KeyRound, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { RoleBadges } from '@/components/role-badges';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.firstName}`}
        description="A single source of truth for your team's delivery lifecycle."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Your roles</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <RoleBadges roles={user.roles} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Permissions</CardTitle>
            <KeyRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{user.permissions.length}</p>
            <p className="text-xs text-muted-foreground">effective permissions granted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Member since
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatDate(user.createdAt)}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What&apos;s next</CardTitle>
          <CardDescription>
            Phase 1 (Authentication &amp; RBAC) is live. Upcoming phases build the delivery core on
            this foundation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>• Requirement → Epic → Story → Task hierarchy</li>
            <li>• Sprint planning &amp; drag-and-drop Kanban</li>
            <li>• Time tracking &amp; personal dashboards</li>
            <li>• Manager / QA / Release dashboards</li>
            <li>• GitHub &amp; Jira integrations</li>
            <li>• Automations, notifications &amp; AI assistant</li>
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
