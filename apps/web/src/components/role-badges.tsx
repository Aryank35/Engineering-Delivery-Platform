import { ROLE_METADATA, type RoleKey } from '@eop/shared';
import { Badge } from '@/components/ui/badge';

export function RoleBadges({ roles }: { roles: RoleKey[] }) {
  if (roles.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((role) => (
        <Badge key={role} variant={role === 'ADMIN' ? 'default' : 'secondary'}>
          {ROLE_METADATA[role].name}
        </Badge>
      ))}
    </div>
  );
}
