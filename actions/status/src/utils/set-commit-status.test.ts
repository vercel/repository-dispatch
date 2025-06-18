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

  it('should skip if not a repository_dispatch event', async () => {
    // Mock context
    (github.context as any) = {
      eventName: 'push',
      payload: {},
    };

    await setCommitStatus({ stage: 'main' });
    expect(core.warning).toHaveBeenCalledWith(
      'This is not a repository_dispatch event: eventName=push',
    );
    expect(mockOctokit.rest.repos.createCommitStatus).not.toHaveBeenCalled();
  });

  it('should skip if no SHA in payload', async () => {
    // Mock context
    (github.context as any) = {
      eventName: 'repository_dispatch',
      payload: {
        client_payload: {},
      },
    };

    await setCommitStatus({ stage: 'main' });
    expect(core.warning).toHaveBeenCalledWith(
      'No SHA found in client_payload.git.sha. Skipping status update.',
    );
    expect(mockOctokit.rest.repos.createCommitStatus).not.toHaveBeenCalled();
  });

  it('should set pending status in main stage', async () => {
    const mockSha = 'abc123';
    const mockJob: MockJob = {
      name: 'test-job',
      html_url: 'https://github.com/test',
      steps: [{ conclusion: 'success' }],
    };

    // Mock context
    (github.context as any) = {
      eventName: 'repository_dispatch',
      payload: {
        client_payload: {
          git: { sha: mockSha },
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
    };

    // Mock context
    (github.context as any) = {
      eventName: 'repository_dispatch',
      payload: {
        client_payload: {
          git: { sha: mockSha },
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
    };

    // Mock context
    (github.context as any) = {
      eventName: 'repository_dispatch',
      payload: {
        client_payload: {
          git: { sha: mockSha },
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
});
