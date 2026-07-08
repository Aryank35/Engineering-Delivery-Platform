import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ListAuditLogsQuery } from '@eop/shared';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/utils';
import { auditApi } from './audit.api';

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');

  const query: Partial<ListAuditLogsQuery> = {
    page,
    pageSize: 15,
    order: 'desc',
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-logs', query],
    queryFn: () => auditApi.list(query),
    placeholderData: (prev) => prev,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <>
      <PageHeader title="Audit Log" description="Every meaningful change across the platform." />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Filter by action (e.g. user.login)"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className="sm:max-w-xs"
            />
            <Input
              placeholder="Filter by entity type (e.g. User)"
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              className="sm:max-w-xs"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-destructive">
                    Failed to load audit log.
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No audit entries found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        {entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.entityType}
                      {entry.entityId ? (
                        <span className="ml-1 font-mono text-xs text-muted-foreground">
                          #{entry.entityId.slice(0, 8)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">{entry.actorEmail ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {entry.ip ?? '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {meta ? (
            <div className="flex items-center justify-between pt-1 text-sm text-muted-foreground">
              <span>
                {meta.total} entr{meta.total === 1 ? 'y' : 'ies'} · page {meta.page} of{' '}
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
