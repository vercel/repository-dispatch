export type Status = 'failure' | 'pending' | 'success';
export type WorkflowStage = 'main' | 'post';
export interface Job {
  steps: { conclusion: string }[];
}
