import * as core from "@actions/core";
import { setCommitStatus } from "../utils/set-commit-status";

export async function main(): Promise<void> {
  try {
    await setCommitStatus({ stage: "main" });
  } catch (error) {
    core.setFailed((error as Error).message);
  }
}

main();
