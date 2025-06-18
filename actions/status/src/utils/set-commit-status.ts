import * as core from '@actions/core';
import * as github from '@actions/github';
import { getStatusForJob } from './get-status-for-job';
import { wait } from './wait';
import type { WorkflowStage, Job } from '../types';

export async function setCommitStatus({
  stage,
}: {
  stage: WorkflowStage;
}): Promise<void> {
  const context = github.context;

  if (context.eventName !== 'repository_dispatch') {
    core.warning(
      `This is not a repository_dispatch event: eventName=${context.eventName}`,
    );
    return;
  }

  const sha = context.payload.client_payload?.git?.sha;
  if (!sha) {
    core.warning(
      'No SHA found in client_payload.git.sha. Skipping status update.',
    );
    return;
  }

  const token = core.getInput('github_token');
  const contextForStatus =
    core.getInput('name') ?? `${context.workflow} / ${context.job}`;
  const octokit = github.getOctokit(token);

  if (stage === 'post') {
    // Give time for steps to propagate conclusions
    core.info('Waiting 5 seconds for job completion to propagate...');
    await wait(5 * 1000);
  }

  const jobs = await octokit.rest.actions.listJobsForWorkflowRun({
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: context.runId,
    filter: 'latest',
    per_page: 100,
  });

  core.info(`jobs: ${JSON.stringify(jobs, null, 2)}`);
  const octokitJob = jobs.data.jobs.find(
    (j: { name: string }) => j.name === context.job,
  );
  if (!octokitJob) {
    throw new Error(`Job not found: ${context.job}`);
  }

  // Convert Octokit job to our Job type
  const job: Job = {
    steps:
      octokitJob.steps?.map((step) => ({
        conclusion: step.conclusion || 'success',
      })) || [],
  };

  // debug job
  const state = getStatusForJob({ stage, job });
  core.info(`Setting commit status for SHA: ${sha}, state: ${state}`);

  const resp = await octokit.rest.repos.createCommitStatus({
    owner: context.repo.owner,
    repo: context.repo.repo,
    sha,
    state,
    context: contextForStatus,
    target_url: octokitJob.html_url || undefined,
  });

  core.debug(JSON.stringify(resp, null, 2));
}
