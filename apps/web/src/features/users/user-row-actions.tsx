import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { MoreHorizontal, ShieldCheck, UserX } from 'lucide-react';
import {
  assignRolesSchema,
  PERMISSIONS,
  ROLE_KEYS,
  ROLE_METADATA,
  type AssignRolesInput,
  type PublicUser,
} from '@eop/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { PermissionGate } from '@/components/permission-gate';
import { useAuthStore } from '@/stores/auth-store';
import { useAssignRoles, useDeactivateUser } from './use-users';

export function UserRowActions({ user }: { user: PublicUser }) {
  const [rolesOpen, setRolesOpen] = useState(false);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isSelf = user.id === currentUserId;

  const deactivate = useDeactivateUser();
  const assign = useAssignRoles(() => setRolesOpen(false));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AssignRolesInput>({
    resolver: zodResolver(assignRolesSchema),
    values: { roles: user.roles },
  });

  const onSubmit = handleSubmit((values) => assign.mutate({ id: user.id, input: values }));

  const onDeactivate = () => {
    if (window.confirm(`Deactivate ${user.fullName}? They will lose access immediately.`)) {
      deactivate.mutate(user.id);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Row actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <PermissionGate permission={PERMISSIONS.USER_ASSIGN_ROLES}>
            <DropdownMenuItem onSelect={() => setRolesOpen(true)}>
              <ShieldCheck />
              Manage roles
            </DropdownMenuItem>
          </PermissionGate>
          <PermissionGate permission={PERMISSIONS.USER_DELETE}>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={isSelf || !user.isActive}
              onSelect={onDeactivate}
            >
              <UserX />
              Deactivate
            </DropdownMenuItem>
          </PermissionGate>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={rolesOpen} onOpenChange={setRolesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage roles</DialogTitle>
            <DialogDescription>{user.fullName} — assign one or more roles.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_KEYS.map((role) => (
                  <label
                    key={role}
                    className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      value={role}
                      {...register('roles')}
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                    {ROLE_METADATA[role].name}
                  </label>
                ))}
              </div>
              {errors.roles ? (
                <p className="text-xs text-destructive">{errors.roles.message}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRolesOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assign.isPending}>
                {assign.isPending ? <Spinner /> : null}
                Save roles
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
