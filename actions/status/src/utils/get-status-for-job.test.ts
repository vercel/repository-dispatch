import { getStatusForJob } from './get-status-for-job';

jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('./wait', () => ({
  wait: jest.fn().mockImplementation(() => Promise.resolve('done')),
}));

describe('getStatusForJob', () => {
  it('should return pending for main stage', () => {
    const result = getStatusForJob({
      stage: 'main',
      job: { steps: [] },
    });
    expect(result).toBe('pending');
  });

  it('should return success for post stage with all successful steps', () => {
    const result = getStatusForJob({
      stage: 'post',
      job: {
        steps: [{ conclusion: 'success' }, { conclusion: 'success' }],
      },
    });
    expect(result).toBe('success');
  });

  it('should return failure for post stage with any failed step', () => {
    const result = getStatusForJob({
      stage: 'post',
      job: {
        steps: [
          { conclusion: 'success' },
          { conclusion: 'failure' },
          { conclusion: 'success' },
        ],
      },
    });
    expect(result).toBe('failure');
  });
});
