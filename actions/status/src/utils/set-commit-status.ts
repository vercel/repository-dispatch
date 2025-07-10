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
  const environment = context.payload.client_payload?.environment;
  const projectName = context.payload.client_payload?.project?.name;
  if (!sha || !environment || !projectName) {
    core.warning(
      'Missing required fields in client_payload. Skipping status update.',
    );
    return;
  }

  const requiredContext = `(${projectName} - ${environment})`;
  const token = core.getInput('github_token');
  const defaultStatusName = `${context.workflow}/${context.job} ${requiredContext}`;
  const contextForStatus = core.getInput('name') || defaultStatusName;
  const octokit = github.getOctokit(token);
  core.debug(`status name: ${contextForStatus}`);

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

  core.debug(`jobs: ${JSON.stringify(jobs, null, 2)}`);
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
  core.debug(
    `Setting commit status for SHA: ${sha}, state: ${state}, context: ${contextForStatus}`,
  );

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
