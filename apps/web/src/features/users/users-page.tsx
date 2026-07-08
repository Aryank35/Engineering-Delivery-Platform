import { useState } from 'react';
import {
  PERMISSIONS,
  ROLE_KEYS,
  ROLE_METADATA,
  type ListUsersQuery,
  type RoleKey,
} from '@eop/shared';
import { PageHeader } from '@/components/page-header';
import { PermissionGate } from '@/components/permission-gate';
import { RoleBadges } from '@/components/role-badges';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime, initials } from '@/lib/utils';
import { CreateUserDialog } from './create-user-dialog';
import { UserRowActions } from './user-row-actions';
import { useUsers } from './use-users';

const selectClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring';

type StatusFilter = 'all' | 'active' | 'inactive';

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleKey | ''>('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const query: Partial<ListUsersQuery> = {
    page,
    pageSize: 10,
    sort: 'createdAt',
    order: 'desc',
    ...(search ? { search } : {}),
    ...(role ? { role } : {}),
    ...(status !== 'all' ? { isActive: status === 'active' } : {}),
  };

  const { data, isLoading, isError } = useUsers(query);
  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage team members, their roles and access."
        actions={
          <PermissionGate permission={PERMISSIONS.USER_CREATE}>
            <CreateUserDialog />
          </PermissionGate>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="sm:max-w-xs"
            />
            <select
              className={selectClass}
              value={role}
              onChange={(e) => {
                setRole(e.target.value as RoleKey | '');
                setPage(1);
              }}
            >
              <option value="">All roles</option>
              {ROLE_KEYS.map((r) => (
                <option key={r} value={r}>
                  {ROLE_METADATA[r].name}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as StatusFilter);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-destructive">
                    Failed to load users.
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No users match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{initials(user.firstName, user.lastName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{user.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadges roles={user.roles} />
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="muted">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(user.lastLoginAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <UserRowActions user={user} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {meta ? (
            <div className="flex items-center justify-between pt-1 text-sm text-muted-foreground">
              <span>
                {meta.total} user{meta.total === 1 ? '' : 's'} · page {meta.page} of{' '}
                {meta.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!meta.hasPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!meta.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
