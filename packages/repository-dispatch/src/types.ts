import type { EVENT_PREFIX } from './constants';

export type DispatchDeploymentEventType =
  | 'vercel.deployment.success'
  | 'vercel.deployment.error'
  | 'vercel.deployment.canceled'
  | 'vercel.deployment.ignored'
  | 'vercel.deployment.skipped'
  | 'vercel.deployment.pending'
  | 'vercel.deployment.failed'
  | 'vercel.deployment.promoted';

export type DeploymentFailedDetail =
  | 'checks_failed'
  | 'aliasing_failed'
  | 'deployment_failed'
  | 'account_blocked'
  | 'authorization_required'
  | 'missing_vercel_access'
  | 'no_vercel_account';

export type DeploymentState =
  | { type: 'pending'; detail?: never }
  | { type: 'success'; detail?: 'checks_skipped' }
  | { type: 'error'; detail?: 'deployment_deleted' }
  | {
      type: 'failed';
      detail: DeploymentFailedDetail;
    }
  | { type: 'skipped'; detail?: never }
  | { type: 'ignored'; detail?: never }
  | { type: 'canceled'; detail?: never }
  | { type: 'promoted'; detail?: never };

export type DispatchType =
  | `${typeof EVENT_PREFIX}.${string}`
  | DispatchDeploymentEventType;
