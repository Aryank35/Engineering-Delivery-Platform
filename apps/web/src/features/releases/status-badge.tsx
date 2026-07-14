import {
  DEPLOYMENT_STATUS_META,
  RELEASE_STATUS_META,
  type DeploymentStatus,
  type ReleaseStatus,
} from '@eop/shared';
import { Badge } from '@/components/ui/badge';

export function ReleaseStatusBadge({ status }: { status: ReleaseStatus }) {
  const meta = RELEASE_STATUS_META[status];
  return <Badge variant={meta.tone}>{meta.label}</Badge>;
}

export function DeploymentStatusBadge({ status }: { status: DeploymentStatus }) {
  const meta = DEPLOYMENT_STATUS_META[status];
  return <Badge variant={meta.tone}>{meta.label}</Badge>;
}
