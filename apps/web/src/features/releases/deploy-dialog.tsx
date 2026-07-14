import { useEffect, useState, type ReactNode } from 'react';
import { DEPLOYMENT_STATUSES, DEPLOYMENT_STATUS_META, type DeploymentStatus } from '@eop/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { useEnvironments } from './use-environments';
import { useDeployRelease } from './use-releases';

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function DeployDialog({ releaseId, trigger }: { releaseId: string; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [environmentId, setEnvironmentId] = useState('');
  const [status, setStatus] = useState<DeploymentStatus>('SUCCEEDED');
  const [notes, setNotes] = useState('');

  const { data: environments = [] } = useEnvironments();
  const deploy = useDeployRelease(releaseId, () => setOpen(false));

  useEffect(() => {
    if (open) {
      setEnvironmentId(environments[0]?.id ?? '');
      setStatus('SUCCEEDED');
      setNotes('');
    }
  }, [open, environments]);

  const submit = () => {
    if (!environmentId) return;
    deploy.mutate({
      environmentId,
      status,
      notes: notes.trim() ? notes.trim() : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record deployment</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="deploy-env">Environment</Label>
            <select
              id="deploy-env"
              className={selectClass}
              value={environmentId}
              onChange={(e) => setEnvironmentId(e.target.value)}
            >
              {environments.length === 0 ? <option value="">No environments</option> : null}
              {environments.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deploy-status">Status</Label>
            <select
              id="deploy-status"
              className={selectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as DeploymentStatus)}
            >
              {DEPLOYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {DEPLOYMENT_STATUS_META[s].label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deploy-notes">Notes</Label>
            <Textarea
              id="deploy-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Build number, commit sha, …"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={deploy.isPending || !environmentId}>
              {deploy.isPending ? <Spinner /> : null}
              Deploy
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
