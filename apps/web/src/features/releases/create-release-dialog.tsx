import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { CreateReleaseInput } from '@eop/shared';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { useCreateRelease } from './use-releases';

const isoFromDate = (value: string) => new Date(`${value}T00:00:00.000Z`).toISOString();

export function CreateReleaseDialog({ onCreated }: { onCreated?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState('');
  const [name, setName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setVersion('');
      setName('');
      setTargetDate('');
      setNotes('');
    }
  }, [open]);

  const create = useCreateRelease((id) => {
    setOpen(false);
    onCreated?.(id);
  });

  const valid = version.trim().length > 0;

  const submit = () => {
    const input: CreateReleaseInput = {
      version: version.trim(),
      name: name.trim() ? name.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
      targetDate: targetDate ? isoFromDate(targetDate) : null,
    };
    create.mutate(input);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New release
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create release</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) submit();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="release-version">Version</Label>
              <Input
                id="release-version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.4.0"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="release-target">Target date</Label>
              <Input
                id="release-target"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="release-name">Name</Label>
            <Input
              id="release-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Summer feature drop"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="release-notes">Notes</Label>
            <Textarea
              id="release-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Highlights, breaking changes, migration steps…"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || !valid}>
              {create.isPending ? <Spinner /> : null}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
