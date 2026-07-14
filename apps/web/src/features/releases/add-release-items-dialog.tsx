import { useEffect, useState } from 'react';
import { ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { TypeIcon } from '@/features/work-items/work-item-badges';
import { useWorkItems } from '@/features/work-items/use-work-items';
import { useReleaseItems } from './use-releases';

export function AddReleaseItemsDialog({ releaseId }: { releaseId: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const { data } = useWorkItems({ pageSize: 100, sort: 'createdAt', order: 'desc' });
  const { add } = useReleaseItems(releaseId, () => setOpen(false));

  useEffect(() => {
    if (open) setSelected([]);
  }, [open]);

  // Only items not already tied to a release are candidates.
  const candidates = (data?.data ?? []).filter((item) => !item.releaseId);

  const toggle = (id: string) =>
    setSelected((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ListPlus className="h-4 w-4" /> Add items
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add work items to release</DialogTitle>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-1 overflow-y-auto">
          {candidates.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No unassigned items available.
            </p>
          ) : (
            candidates.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={() => toggle(item.id)}
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                />
                <TypeIcon type={item.type} />
                <span className="font-mono text-xs text-muted-foreground">{item.key}</span>
                <span className="flex-1 truncate">{item.title}</span>
              </label>
            ))
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={add.isPending || selected.length === 0}
            onClick={() => add.mutate({ itemIds: selected })}
          >
            {add.isPending ? <Spinner /> : null}
            Add {selected.length > 0 ? `(${selected.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
