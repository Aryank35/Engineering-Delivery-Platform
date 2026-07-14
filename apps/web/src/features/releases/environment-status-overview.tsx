import { Link } from 'react-router-dom';
import { Server } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import { useEnvironmentStatus } from './use-environments';

/** A row of cards showing which release is currently live in each environment. */
export function EnvironmentStatusOverview() {
  const { data, isLoading } = useEnvironmentStatus();

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const environments = data ?? [];
  if (environments.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {environments.map(({ environment, currentRelease }) => (
        <Card key={environment.id}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: environment.color }}
              />
              <span className="text-sm font-semibold">{environment.name}</span>
              {environment.isProduction ? (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Prod
                </span>
              ) : null}
            </div>
            {currentRelease ? (
              <div className="mt-3">
                <Link
                  to={`/releases/${currentRelease.id}`}
                  className="font-mono text-sm font-medium text-primary hover:underline"
                >
                  {currentRelease.version}
                </Link>
                {currentRelease.name ? (
                  <p className="truncate text-xs text-muted-foreground">{currentRelease.name}</p>
                ) : null}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Deployed {formatDate(currentRelease.deployedAt)}
                  {currentRelease.deployedBy ? ` · ${currentRelease.deployedBy.fullName}` : ''}
                </p>
              </div>
            ) : (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Server className="h-3.5 w-3.5" /> Nothing deployed yet
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
