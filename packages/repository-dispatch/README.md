# `@vercel/repository-dispatch`

Utilities and types for working with [`repository_dispatch`](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#repository_dispatch) events triggered by Vercel.

[Learn more](https://vercel.com/docs/git/vercel-for-github#repository-dispatch)

# Examples

## Using in CI

The [ci-example](./examples/ci-example) shows common ways to use `repository_dispatch` events in a CI workflow for GitHub projects connected to Vercel.

# Events

## Supported Events

```yaml
on:
  repository_dispatch:
    types:
      # Deployment has been promoted to production (automatic or manual)
      - 'vercel.deployment.promoted'
      # Deployment has finished building and has automatically been promoted to production
      - 'vercel.deployment.success'
      # Deployment has finished building, but has not been promoted to production
      - 'vercel.deployment.ready'
      # Deployment has failed to build
      - 'vercel.deployment.error'
      # Deployment has been canceled
      - 'vercel.deployment.canceled'
      # Deployment canceled as a result of the ignored build script (https://vercel.com/docs/project-configuration/git-settings#ignored-build-step)
      - 'vercel.deployment.ignored'
      # Deployment canceled as a result of automatic deployment skipping (https://vercel.com/docs/monorepos#skipping-unaffected-projects)
      - 'vercel.deployment.skipped'
      # Deployment waiting to start building pending
      - 'vercel.deployment.pending'
      # Deployment has failed
      - 'vercel.deployment.failed'
```

**NOTE**: Wildcards _are_ supported for the `type` field:

```yaml
on:
  repository_dispatch:
    types:
      # All deployment events
      - 'vercel.deployment.*'
```

## Payload Example

```json
{
  "environment": "production",
  "git": {
    "ref": "main",
    "sha": "abcdef1234567890abcdef1234567890abcdef12",
    "shortSha": "abcdef1"
  },
  "id": "dpl_1234567890abcdefghijklmnopqrstuvwxyz",
  "project": {
    "id": "prj_abcdef1234567890abcdef1234567890",
    "name": "example-project"
  },
  "state": {
    "type": "pending"
  },
  "url": "https://example-project-abc123.vercel.app"
}
```

> [!NOTE]  
> View the complete Typescript definitions for this payload [here](./packages/repository-dispatch/src/data/deployment.ts).

# Actions

1. [Checkout](./actions/checkout/action.yaml) - Automatically checks out the ref from the SHA of the deployment.

> [!IMPORTANT]  
> This should be used whenever your action needs to
>
> 1. Checkout your repository
> 2. The checkout should run in the context of the repository when the deployment was created.
>
> This is required because GitHub [repository_dispatch](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#repository_dispatch) events are always triggered using the _last commit on default branch_ as the GITHUB_SHA in the context of the workflow.

2. [Status](./actions/status/action.yaml) - Automatically sets a commit status for the ref associated with the deployment.

> [!IMPORTANT]  
> This should be used whenever your action needs to
>
> 1. Checkout your repository
> 2. The checkout should run in the context of the repository when the deployment was created.
>
> This is required because GitHub [repository_dispatch](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#repository_dispatch) events are always triggered using the _last commit on default branch_ as the GITHUB_SHA in the context of the workflow.

3. [Debug](./actions/debug/action.yaml) - Echos the repository dispatch event payload for debugging purposes.
