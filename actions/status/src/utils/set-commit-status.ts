import * as core from '@actions/core';
import * as github from '@actions/github';
import type { Context } from '@actions/github/lib/context';
import { getStatusForJob } from './get-status-for-job';
import { wait } from './wait';
import type { WorkflowStage, Job } from '../types';

function getRequiredContext(context: Context):
  | {
      sha: string;
      environment?: string;
      projectName?: string;
    }
  | undefined {
  if (context.eventName === 'repository_dispatch') {
    const sha = context.payload.client_payload?.git?.sha;
    const environment = context.payload.client_payload?.environment;
    const projectName = context.payload.client_payload?.project?.name;
    if (!sha) {
      core.warning('Missing required context. Skipping status update.');
      return undefined;
    }

    return {
      sha,
      environment,
      projectName,
    };
  }

  /**
   * workflow_dispatch is the same as repository_dispatch in that the SHA in the context is always set to HEAD,
   * but it's triggered by a workflow run so we can't guarantee what the intended SHA is. The best way to handle this
   * is use an input to specify the SHA and set a commit status for that SHA manually using action script.
   */
  if (context.eventName === 'workflow_dispatch') {
    core.warning('workflow_dispatch is not supported');
    return undefined;
  }

  return {
    sha: context.sha,
  };
}

export async function setCommitStatus({
  stage,
}: {
  stage: WorkflowStage;
}): Promise<void> {
  const context = github.context;
  const token = core.getInput('github_token');
  const octokit = github.getOctokit(token);

  const requiredContext = getRequiredContext(context);
  if (requiredContext === undefined) {
    core.warning('Missing required context. Skipping status update.');
    return;
  }

  const { sha, environment, projectName } = requiredContext;

  const autoContext =
    projectName && environment ? ` (${projectName} - ${environment})` : '';
  const defaultStatusName = `${context.workflow} | ${context.job}${autoContext}`;
  const contextForStatus = core.getInput('name') || defaultStatusName;
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

  // find the job that matches the runId
  core.debug(`jobs: ${JSON.stringify(jobs, null, 2)}`);
  core.debug(`context.runId: ${context.runId}`);
  const octokitJob = jobs.data.jobs.find(
    (j: (typeof jobs.data.jobs)[number]) => j.run_id === context.runId,
  );

  if (!octokitJob) {
    throw new Error(`Run not found: ${context.runId} (${context.job})`);
  }

  // Convert Octokit job to our Job type
  const job: Job = {
    steps:
      octokitJob.steps?.map((step) => ({
        conclusion: step.conclusion || 'success',
      })) || [],
  };

  const state = getStatusForJob({ stage, job });
  core.info(
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
