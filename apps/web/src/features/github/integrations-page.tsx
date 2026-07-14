import { Github } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGithubStatus } from './use-github';

export function IntegrationsPage() {
  const { data, isLoading } = useGithubStatus();

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect external tools to automate your delivery workflow."
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Github className="h-5 w-5" /> GitHub
          </CardTitle>
          {isLoading ? (
            <Skeleton className="h-5 w-24" />
          ) : (
            <Badge variant={data?.configured ? 'success' : 'muted'}>
              {data?.configured ? 'Connected' : 'Not configured'}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Webhooks link branches, commits and pull requests to work items and move them across
            the board automatically. Reference a work-item key (e.g.{' '}
            <span className="font-mono">EOP-42</span>) in a branch name, commit message or PR title.
          </p>

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Webhook URL
            </p>
            <code className="block rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
              {isLoading ? '…' : `<your-api-host>${data?.webhookPath ?? ''}`}
            </code>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Handled events
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(data?.handledEvents ?? []).map((event) => (
                <Badge key={event} variant="secondary" className="font-mono">
                  {event}
                </Badge>
              ))}
            </div>
          </div>

          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>
              Set <span className="font-mono">GITHUB_WEBHOOK_SECRET</span> on the API and restart.
            </li>
            <li>
              In your repo → Settings → Webhooks, add the URL above with content type{' '}
              <span className="font-mono">application/json</span> and the same secret.
            </li>
            <li>Subscribe to the events listed above.</li>
          </ol>

          {!isLoading && !data?.configured ? (
            <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              The webhook endpoint rejects requests until{' '}
              <span className="font-mono">GITHUB_WEBHOOK_SECRET</span> is set.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
