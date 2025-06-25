import * as core from '@actions/core';
import { setCommitStatus } from '../utils/set-commit-status';

export async function post(): Promise<void> {
  try {
    await setCommitStatus({ stage: 'post' });
  } catch (error) {
    core.warning((error as Error).message);
  }
}

post();
