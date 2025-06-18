import type { WorkflowStage, Status, Job } from '../types';

export function getStatusForJob({
  stage,
  job,
}: {
  stage: WorkflowStage;
  job: Job;
}): Status {
  if (stage !== 'post') {
    return 'pending';
  }
  const failedStep = job.steps.find((step) => step.conclusion === 'failure');
  if (failedStep) {
    return 'failure';
  }

  return 'success';
}
