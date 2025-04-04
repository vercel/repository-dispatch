# Release

Releases are handled with changesets. To create a new release - run:

```bash
pnpm changeset
```

and follow the prompts. Commit the resulting changeset file and push it to the repository. Do not manually change the version of the package to be published. Changesets will automatically determine the correct version, and handle the release process.
