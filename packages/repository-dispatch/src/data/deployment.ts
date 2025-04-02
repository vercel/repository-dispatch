import type { DeploymentState } from '../types';
import type { DispatchDataCommon } from './common';

/**
 * Interface for successful deployment events
 */
export interface DispatchDataDeploymentStatusEvent extends DispatchDataCommon {
  /**
   * Deployment url
   */
  url: string;
  state: DeploymentState;
}

/**
 * Interface for failed deployment events
 */
export interface DispatchDataDeploymentErrorEvent extends DispatchDataCommon {
  /**
   * Failure reason
   */
  error?: string;
  state: DeploymentState;
}

/**
 * Interface for all deployment events
 */
export type DispatchDeploymentEvent =
  | DispatchDataDeploymentStatusEvent
  | DispatchDataDeploymentErrorEvent;
