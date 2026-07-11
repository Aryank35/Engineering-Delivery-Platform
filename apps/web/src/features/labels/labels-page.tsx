import { useEffect, useState, type ReactNode } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { PERMISSIONS, type LabelDto } from '@eop/shared';
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
import { useCreateLabel, useDeleteLabel, useLabels, useUpdateLabel } from './use-labels';

interface LabelFormDialogProps {
  mode: 'create' | 'edit';
  initial?: LabelDto;
  trigger: ReactNode;
}

function LabelFormDialog({ mode, initial, trigger }: LabelFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? '#7c3aed');

  const create = useCreateLabel(() => setOpen(false));
  const update = useUpdateLabel(() => setOpen(false));
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setColor(initial?.color ?? '#7c3aed');
    }
  }, [open, initial]);

  const submit = () => {
    if (mode === 'create') {
      create.mutate({ name: name.trim(), color });
    } else if (initial) {
      update.mutate({ id: initial.id, input: { name: name.trim(), color } });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'New label' : 'Edit label'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="label-name">Name</Label>
            <Input
              id="label-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="label-color">Colour</Label>
            <div className="flex items-center gap-2">
              <input
                id="label-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || name.trim().length === 0}>
              {pending ? <Spinner /> : null}
              {mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LabelsPage() {
  const { data: labels = [], isLoading } = useLabels();
  const del = useDeleteLabel();

  return (
    <>
      <PageHeader
        title="Labels"
        description="Categorise work items across the backlog."
        actions={
          <PermissionGate permission={PERMISSIONS.LABEL_MANAGE}>
            <LabelFormDialog
              mode="create"
              trigger={
                <Button>
                  <Plus className="h-4 w-4" /> New label
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
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : labels.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">No labels yet.</p>
          ) : (
            <ul className="divide-y">
              {labels.map((label) => (
                <li key={label.id} className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                    <span className="font-mono text-xs text-muted-foreground">{label.color}</span>
                  </span>
                  <PermissionGate permission={PERMISSIONS.LABEL_MANAGE}>
                    <div className="flex gap-1">
                      <LabelFormDialog
                        mode="edit"
                        initial={label}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Edit label">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        aria-label="Delete label"
                        onClick={() => {
                          if (window.confirm(`Delete label "${label.name}"?`)) del.mutate(label.id);
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
