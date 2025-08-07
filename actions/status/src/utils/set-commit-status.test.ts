import * as core from '@actions/core';
import * as github from '@actions/github';
import { setCommitStatus } from './set-commit-status';
import { getStatusForJob } from './get-status-for-job';

// Mock the GitHub Actions core module
jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('./wait', () => ({
  wait: jest.fn().mockImplementation(() => Promise.resolve('done')),
}));

describe('setCommitStatus', () => {
  type MockJob = {
    name: string;
    html_url: string;
    steps: { conclusion: string }[];
    run_id: number;
  };

  type MockResponse = {
    data: {
      jobs: MockJob[];
    };
  };

  let jobs: MockJob[] = [];
  let mockOctokit: {
    rest: {
      actions: {
        listJobsForWorkflowRun: jest.Mock;
      };
      repos: {
        createCommitStatus: jest.Mock;
      };
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock github.getOctokit
    mockOctokit = {
      rest: {
        actions: {
          listJobsForWorkflowRun: jest
            .fn<Promise<MockResponse>, any[]>()
            .mockImplementation(() => Promise.resolve({ data: { jobs } })),
        },
        repos: {
          createCommitStatus: jest
            .fn()
            .mockImplementation(() => Promise.resolve({ data: {} })),
        },
      },
    };

    (github.getOctokit as jest.Mock).mockReturnValue(mockOctokit);
    // Mock core.getInput
    (core.getInput as jest.Mock).mockImplementation((name: unknown) => {
      if (name === 'github_token') return 'mock-token';
      if (name === 'name') return 'mock-context';
      return undefined;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle non-repository_dispatch events using context.sha', async () => {
    // Mock core.getInput to return empty for 'name' to test auto generation
    (core.getInput as jest.Mock).mockImplementation((name: unknown) => {
      if (name === 'github_token') return 'mock-token';
      if (name === 'name') return ''; // Empty name to test auto generation
      return undefined;
    });

    // Mock context
    (github.context as any) = {
      eventName: 'push',
      payload: {},
      sha: 'def456',
      repo: { owner: 'test-owner', repo: 'test-repo' },
      runId: 123,
      job: 'test-job',
      workflow: 'test-workflow',
    };

    const mockJob: MockJob = {
      name: 'test-job',
      html_url: 'https://github.com/test',
      steps: [{ conclusion: 'success' }],
      run_id: 123,
    };

    // Mock listJobsForWorkflowRun response with run_id matching
    const mockResponse: MockResponse = {
      data: { jobs: [mockJob] },
    };
    (
      mockOctokit.rest.actions.listJobsForWorkflowRun as jest.Mock<
        Promise<MockResponse>,
        any[]
      >
    ).mockResolvedValueOnce(mockResponse);

    await setCommitStatus({ stage: 'main' });

    expect(mockOctokit.rest.repos.createCommitStatus).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      sha: 'def456',
      state: 'pending',
      context: 'test-workflow | test-job',
      target_url: 'https://github.com/test',
    });
  });

  it('should skip if no SHA in payload for repository_dispatch', async () => {
    // Mock context
    (github.context as any) = {
      eventName: 'repository_dispatch',
      payload: {
        client_payload: {},
      },
    };

    await setCommitStatus({ stage: 'main' });
    expect(core.warning).toHaveBeenCalledWith(
      'Missing required context. Skipping status update.',
    );
    expect(mockOctokit.rest.repos.createCommitStatus).not.toHaveBeenCalled();
  });

  it('should skip workflow_dispatch events with warning', async () => {
    // Mock context
    (github.context as any) = {
      eventName: 'workflow_dispatch',
      payload: {},
    };

    await setCommitStatus({ stage: 'main' });
    expect(core.warning).toHaveBeenCalledWith(
      'workflow_dispatch is not supported',
    );
    expect(core.warning).toHaveBeenCalledWith(
      'Missing required context. Skipping status update.',
    );
    expect(mockOctokit.rest.repos.createCommitStatus).not.toHaveBeenCalled();
  });

  it('should set pending status in main stage', async () => {
    const mockSha = 'abc123';
    const mockJob: MockJob = {
      name: 'test-job',
      html_url: 'https://github.com/test',
      steps: [{ conclusion: 'success' }],
      run_id: 123,
    };

    // Mock context
    (github.context as any) = {
      eventName: 'repository_dispatch',
      payload: {
        client_payload: {
          git: { sha: mockSha },
          environment: 'production',
          project: { name: 'test-project' },
        },
      },
      repo: { owner: 'test-owner', repo: 'test-repo' },
      runId: 123,
      job: 'test-job',
      workflow: 'test-workflow',
    };

    // Mock listJobsForWorkflowRun response
    const mockResponse: MockResponse = {
      data: { jobs: [mockJob] },
    };
    (
      mockOctokit.rest.actions.listJobsForWorkflowRun as jest.Mock<
        Promise<MockResponse>,
        any[]
      >
    ).mockResolvedValueOnce(mockResponse);

    await setCommitStatus({ stage: 'main' });

    expect(mockOctokit.rest.repos.createCommitStatus).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      sha: mockSha,
      state: 'pending',
      context: 'mock-context',
      target_url: 'https://github.com/test',
    });
  });

  it('should set success status in post stage when all steps succeed', async () => {
    const mockSha = 'abc123';
    const mockJob: MockJob = {
      name: 'test-job',
      html_url: 'https://github.com/test',
      steps: [{ conclusion: 'success' }],
      run_id: 123,
    };

    // Mock context
    (github.context as any) = {
      eventName: 'repository_dispatch',
      payload: {
        client_payload: {
          git: { sha: mockSha },
          environment: 'production',
          project: { name: 'test-project' },
        },
      },
      repo: { owner: 'test-owner', repo: 'test-repo' },
      runId: 123,
      job: 'test-job',
      workflow: 'test-workflow',
    };

    // Mock listJobsForWorkflowRun response
    const mockResponse: MockResponse = {
      data: { jobs: [mockJob] },
    };
    (
      mockOctokit.rest.actions.listJobsForWorkflowRun as jest.Mock<
        Promise<MockResponse>,
        any[]
      >
    ).mockResolvedValueOnce(mockResponse);

    await setCommitStatus({ stage: 'post' });

    expect(mockOctokit.rest.repos.createCommitStatus).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      sha: mockSha,
      state: 'success',
      context: 'mock-context',
      target_url: 'https://github.com/test',
    });
  });

  it('should set failure status in post stage when any step fails', async () => {
    const mockSha = 'abc123';
    const mockJob: MockJob = {
      name: 'test-job',
      html_url: 'https://github.com/test',
      steps: [{ conclusion: 'failure' }],
      run_id: 123,
    };

    // Mock context
    (github.context as any) = {
      eventName: 'repository_dispatch',
      payload: {
        client_payload: {
          git: { sha: mockSha },
          environment: 'production',
          project: { name: 'test-project' },
        },
      },
      repo: { owner: 'test-owner', repo: 'test-repo' },
      runId: 123,
      job: 'test-job',
      workflow: 'test-workflow',
    };

    // Mock listJobsForWorkflowRun response
    const mockResponse: MockResponse = {
      data: { jobs: [mockJob] },
    };
    (
      mockOctokit.rest.actions.listJobsForWorkflowRun as jest.Mock<
        Promise<MockResponse>,
        any[]
      >
    ).mockResolvedValueOnce(mockResponse);

    await setCommitStatus({ stage: 'post' });

    expect(mockOctokit.rest.repos.createCommitStatus).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      sha: mockSha,
      state: 'failure',
      context: 'mock-context',
      target_url: 'https://github.com/test',
    });
  });

  it('should generate automatic context name with project and environment', async () => {
    // Mock core.getInput to return empty for 'name' to test auto generation
    (core.getInput as jest.Mock).mockImplementation((name: unknown) => {
      if (name === 'github_token') return 'mock-token';
      if (name === 'name') return ''; // Empty name to test auto generation
      return undefined;
    });

    const mockSha = 'abc123';
    const mockJob: MockJob = {
      name: 'test-job',
      html_url: 'https://github.com/test',
      steps: [{ conclusion: 'success' }],
      run_id: 123,
    };

    // Mock context
    (github.context as any) = {
      eventName: 'repository_dispatch',
      payload: {
        client_payload: {
          git: { sha: mockSha },
          environment: 'production',
          project: { name: 'test-project' },
        },
      },
      repo: { owner: 'test-owner', repo: 'test-repo' },
      runId: 123,
      job: 'test-job',
      workflow: 'test-workflow',
    };

    // Mock listJobsForWorkflowRun response
    const mockResponse: MockResponse = {
      data: { jobs: [mockJob] },
    };
    (
      mockOctokit.rest.actions.listJobsForWorkflowRun as jest.Mock<
        Promise<MockResponse>,
        any[]
      >
    ).mockResolvedValueOnce(mockResponse);

    await setCommitStatus({ stage: 'main' });

    expect(mockOctokit.rest.repos.createCommitStatus).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      sha: mockSha,
      state: 'pending',
      context: 'test-workflow | test-job (test-project - production)',
      target_url: 'https://github.com/test',
    });
  });

  it('should throw error when job is not found', async () => {
    const mockSha = 'abc123';

    // Mock context
    (github.context as any) = {
      eventName: 'repository_dispatch',
      payload: {
        client_payload: {
          git: { sha: mockSha },
          environment: 'production',
          project: { name: 'test-project' },
        },
      },
      repo: { owner: 'test-owner', repo: 'test-repo' },
      runId: 123,
      job: 'test-job',
      workflow: 'test-workflow',
    };

    // Mock listJobsForWorkflowRun response with no matching run_id
    const mockResponse: MockResponse = {
      data: {
        jobs: [
          {
            name: 'other-job',
            html_url: 'https://github.com/other',
            steps: [],
            run_id: 456,
          },
        ],
      },
    };
    (
      mockOctokit.rest.actions.listJobsForWorkflowRun as jest.Mock<
        Promise<MockResponse>,
        any[]
      >
    ).mockResolvedValueOnce(mockResponse);

    await expect(setCommitStatus({ stage: 'main' })).rejects.toThrow(
      'Run not found: 123 (test-job)',
    );
    expect(mockOctokit.rest.repos.createCommitStatus).not.toHaveBeenCalled();
  });
});
