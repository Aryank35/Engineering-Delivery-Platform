import { useEffect, useState, type ReactNode } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { PERMISSIONS, type EnvironmentDto } from '@eop/shared';
import { PageHeader } from '@/components/page-header';
import { PermissionGate } from '@/components/permission-gate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  useCreateEnvironment,
  useDeleteEnvironment,
  useEnvironments,
  useUpdateEnvironment,
} from './use-environments';

interface EnvFormDialogProps {
  mode: 'create' | 'edit';
  initial?: EnvironmentDto;
  trigger: ReactNode;
}

function EnvFormDialog({ mode, initial, trigger }: EnvFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(initial?.key ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? '#6b7280');
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [isProduction, setIsProduction] = useState(initial?.isProduction ?? false);

  const create = useCreateEnvironment(() => setOpen(false));
  const update = useUpdateEnvironment(() => setOpen(false));
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      setKey(initial?.key ?? '');
      setName(initial?.name ?? '');
      setColor(initial?.color ?? '#6b7280');
      setSortOrder(String(initial?.sortOrder ?? 0));
      setIsProduction(initial?.isProduction ?? false);
    }
  }, [open, initial]);

  const submit = () => {
    const payload = {
      key: key.trim(),
      name: name.trim(),
      color,
      sortOrder: Number(sortOrder) || 0,
      isProduction,
    };
    if (mode === 'create') {
      create.mutate(payload);
    } else if (initial) {
      update.mutate({ id: initial.id, input: payload });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'New environment' : 'Edit environment'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="env-key">Key</Label>
              <Input
                id="env-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="production"
                className="font-mono"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="env-name">Name</Label>
              <Input
                id="env-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Production"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="env-color">Colour</Label>
              <div className="flex items-center gap-2">
                <input
                  id="env-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background"
                />
                <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="env-order">Order</Label>
              <Input
                id="env-order"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isProduction}
              onChange={(e) => setIsProduction(e.target.checked)}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            Production environment
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !key.trim() || !name.trim()}>
              {pending ? <Spinner /> : null}
              {mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EnvironmentsPage() {
  const { data: environments = [], isLoading } = useEnvironments();
  const del = useDeleteEnvironment();

  return (
    <>
      <PageHeader
        title="Environments"
        description="Deployment targets releases are promoted through."
        actions={
          <PermissionGate permission={PERMISSIONS.RELEASE_MANAGE}>
            <EnvFormDialog
              mode="create"
              trigger={
                <Button>
                  <Plus className="h-4 w-4" /> New environment
                </Button>
              }
            />
          </PermissionGate>
        }
      />

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : environments.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">No environments yet.</p>
          ) : (
            <ul className="divide-y">
              {environments.map((env) => (
                <li key={env.id} className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: env.color }} />
                    {env.name}
                    <span className="font-mono text-xs text-muted-foreground">{env.key}</span>
                    {env.isProduction ? (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Prod
                      </span>
                    ) : null}
                  </span>
                  <PermissionGate permission={PERMISSIONS.RELEASE_MANAGE}>
                    <div className="flex gap-1">
                      <EnvFormDialog
                        mode="edit"
                        initial={env}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Edit environment">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        aria-label="Delete environment"
                        onClick={() => {
                          if (window.confirm(`Delete environment "${env.name}"?`))
                            del.mutate(env.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </PermissionGate>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
