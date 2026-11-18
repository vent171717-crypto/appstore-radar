import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { VerificationStatus } from '../types.ts';

interface StatusIndicatorProps {
  status: VerificationStatus;
  compact?: boolean;
}

const STATUS_META: Record<
  VerificationStatus,
  {
    label: string;
    shortLabel: string;
    textColor: string;
  }
> = {
  published: {
    label: 'Publicado en Amazon Appstore',
    shortLabel: 'Publicado',
    textColor: 'text-emerald-700',
  },
  different_edition: {
    label: 'Edición distinta o disponibilidad parcial',
    shortLabel: 'Edición distinta',
    textColor: 'text-amber-700',
  },
  not_published: {
    label: 'No publicado en Amazon Appstore',
    shortLabel: 'No publicado',
    textColor: 'text-red-700',
  },
};

export function StatusIndicator({ status, compact = false }: StatusIndicatorProps) {
  const meta = STATUS_META[status];

  const Icon =
    status === 'published'
      ? CheckCircle2
      : status === 'different_edition'
        ? AlertTriangle
        : XCircle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold whitespace-nowrap shrink-0 ${
        compact ? 'text-xs' : 'text-sm'
      } ${meta.textColor}`}
    >
      <Icon className={compact ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0'} aria-hidden="true" />
      <span>{compact ? meta.shortLabel : meta.label}</span>
    </span>
  );
}
