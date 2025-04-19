# Publishing Guide for Kanbn

This guide explains how to publish the Kanbn package to npm.

## Prerequisites

1. Ensure you have an npm account
2. Make sure you're logged in to npm via the CLI:
   ```
   npm login
   ```
3. Verify you have the necessary permissions to publish to the `@tosin2013` organization

## Preparing for Publication

1. Update the version number in `package.json`
2. Update the CHANGELOG.md with details of changes
3. Ensure all tests pass:
   ```
   npm test
   ```
4. Build the package if necessary:
   ```
   npm run build
   ```

## Publishing to npm

1. Run the npm publish command:
   ```
   npm publish --access public
   ```
   
   If this is the first time publishing this package:
   ```
   npm publish --access public
   ```

2. Verify the package is published:
   ```
   npm view @tosin2013/kanbn
   ```

## Publishing a New Version

1. Update the version in `package.json` using semantic versioning:
   - Patch version for backwards-compatible bug fixes (1.0.0 → 1.0.1)
   - Minor version for backwards-compatible new features (1.0.0 → 1.1.0)
   - Major version for breaking changes (1.0.0 → 2.0.0)

2. Commit the version change:
   ```
   git add package.json CHANGELOG.md
   git commit -m "Bump version to x.y.z"
   git push
   ```

3. Create a git tag for the version:
   ```
   git tag -a vx.y.z -m "Version x.y.z"
   git push origin vx.y.z
   ```

4. Publish to npm:
   ```
   npm publish --access public
   ```

## Troubleshooting

- If you get an error about not being logged in, run `npm login` again
- If you get a permission error, ensure you have the right access to the organization
- If the package name is already taken, check if you need to use a scoped package name

## Using the Published Package

Users can install the package using:

```
npm install -g @tosin2013/kanbn
```

For the AI features, users will need to set the OpenRouter API key:

```
export OPENROUTER_API_KEY=your_api_key_here
```

## Updating Documentation

After publishing, make sure to update any relevant documentation websites or repositories to reflect the new version and features.
