/**
 * Interface shared across all dispatched events
 */
export interface DispatchDataCommon {
  project: {
    name: string;
    id: string;
  };
  environment: string;
  git: {
    ref: string;
    sha: string;
    shortSha: string;
  };
}
