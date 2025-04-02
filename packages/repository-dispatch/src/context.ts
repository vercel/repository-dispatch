import type { context } from '@actions/github';
import type { DispatchDeploymentEventType } from './types';
import type { DispatchDeploymentEvent } from './data/deployment';

type Context = typeof context;

export interface RepositoryDispatchContext extends Context {
  eventName: 'repository_dispatch';
  payload: {
    action: DispatchDeploymentEventType;
    client_payload: DispatchDeploymentEvent;
  };
}
