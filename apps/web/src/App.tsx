import { Route, Routes } from 'react-router-dom';
import { PERMISSIONS } from '@eop/shared';
import { AppShell } from '@/components/layout/app-shell';
import { NotFoundPage } from '@/components/not-found';
import { ProtectedRoute, PublicOnlyRoute, RequirePermissionRoute } from '@/components/route-guards';
import { LoginPage } from '@/features/auth/login-page';
import { RegisterPage } from '@/features/auth/register-page';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { UsersPage } from '@/features/users/users-page';
import { AuditPage } from '@/features/audit/audit-page';
import { ProfilePage } from '@/features/profile/profile-page';
import { WorkItemsPage } from '@/features/work-items/work-items-page';
import { WorkItemDetailPage } from '@/features/work-items/work-item-detail-page';
import { LabelsPage } from '@/features/labels/labels-page';
import { SprintsPage } from '@/features/sprints/sprints-list-page';
import { SprintBoardPage } from '@/features/sprints/board/sprint-board-page';
import { InsightsPage } from '@/features/analytics/insights-page';

export function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route element={<RequirePermissionRoute permission={PERMISSIONS.WORKITEM_READ} />}>
            <Route path="/work" element={<WorkItemsPage />} />
            <Route path="/work/:id" element={<WorkItemDetailPage />} />
          </Route>
          <Route element={<RequirePermissionRoute permission={PERMISSIONS.SPRINT_READ} />}>
            <Route path="/sprints" element={<SprintsPage />} />
            <Route path="/sprints/:id" element={<SprintBoardPage />} />
          </Route>
          <Route element={<RequirePermissionRoute permission={PERMISSIONS.ANALYTICS_READ} />}>
            <Route path="/insights" element={<InsightsPage />} />
          </Route>
          <Route element={<RequirePermissionRoute permission={PERMISSIONS.LABEL_READ} />}>
            <Route path="/labels" element={<LabelsPage />} />
          </Route>
          <Route element={<RequirePermissionRoute permission={PERMISSIONS.USER_READ} />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
          <Route element={<RequirePermissionRoute permission={PERMISSIONS.AUDIT_READ} />}>
            <Route path="/audit" element={<AuditPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
