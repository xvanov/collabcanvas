# GitHub Actions Workflows

This repository uses GitHub Actions for CI/CD. Here's what runs automatically:

## Workflows

### 1. Deploy to Firebase Hosting on merge
**File:** `firebase-hosting-merge.yml`  
**Triggers:** Push to `main` branch  
**Purpose:** Deploy to production

**Steps:**
1. ✅ Checkout code
2. ✅ Setup Node.js 20 with npm cache
3. ✅ Install dependencies (`npm ci`)
4. ✅ **Run linter** (`npm run lint`) - Must pass to deploy
5. ✅ **Run tests** (`npm test`) - Must pass to deploy
6. ✅ Build production bundle (`npm run build`)
7. 🚀 **Deploy to Firebase Hosting LIVE**

**What this means:**
- Every push to `main` automatically deploys to production
- Code must pass linting and all tests before deploy
- If any step fails, deployment is blocked
- Your live site updates automatically!

### 2. Deploy to Firebase Hosting on PR
**File:** `firebase-hosting-pull-request.yml`  
**Triggers:** Pull requests  
**Purpose:** Preview changes before merging

**Steps:**
1. ✅ Checkout code
2. ✅ Setup Node.js 20 with npm cache
3. ✅ Install dependencies (`npm ci`)
4. ✅ **Run linter** (`npm run lint`) - Must pass
5. ✅ **Run tests** (`npm test`) - Must pass
6. ✅ Build production bundle (`npm run build`)
7. 🔍 **Deploy preview to temporary URL**
8. 📝 **Post preview URL as PR comment**

**What this means:**
- Every PR gets a temporary preview URL
- You can test changes before merging
- Preview URLs expire after PR is closed
- Reviewers can see live changes

## Quality Gates

Both workflows enforce these quality gates:

| Check | Tool | Purpose |
|-------|------|---------|
| **Linting** | ESLint | Code quality & style consistency |
| **Tests** | Vitest | All 12 tests must pass |
| **Build** | Vite | Must compile without errors |

**If any check fails, deployment is blocked! ✋**

## Workflow Comparison

| Feature | On Main Push | On Pull Request |
|---------|--------------|-----------------|
| Lint & Test | ✅ Yes | ✅ Yes |
| Build | ✅ Yes | ✅ Yes |
| Deploy | 🚀 Live site | 🔍 Preview URL |
| URL Posted | ❌ No | ✅ Yes (in PR) |
| Persist After | ✅ Forever | ❌ Temp only |

## Local Testing (Before Push)

**Always run these locally before pushing:**

```bash
cd collabcanvas

# Run linter
npm run lint

# Run tests
npm test

# Build for production
npm run build
```

**All should pass! ✅**

## Secrets Required

These GitHub secrets must be configured:

- `GITHUB_TOKEN` - Automatically provided by GitHub ✅
- `FIREBASE_SERVICE_ACCOUNT_COLLABCANVAS_DEV` - Set in repository settings

## Viewing Workflow Runs

1. Go to your GitHub repository
2. Click **"Actions"** tab
3. See all workflow runs
4. Click a run to see detailed logs

## Troubleshooting

### Deployment Blocked?
Check which step failed:
- **Lint failed** → Fix ESLint errors locally
- **Tests failed** → Fix failing tests locally
- **Build failed** → Fix TypeScript/build errors

### Preview URL not posted?
- Check PR is from same repo (not fork)
- Check Firebase service account is configured
- Check workflow logs for errors

## Performance

**Cache Strategy:**
- Node modules cached for faster installs
- Typical run time: 2-3 minutes
- Parallel where possible

## Best Practices

1. ✅ **Always run checks locally** before pushing
2. ✅ **Review preview URLs** before merging PRs
3. ✅ **Wait for CI to pass** before merging
4. ✅ **Check live site** after merging to main
5. ❌ **Never skip CI checks** or force push

## Future Enhancements

Possible additions:
- [ ] Firebase emulator tests in CI
- [ ] Code coverage reporting
- [ ] Performance budget checks
- [ ] Lighthouse CI scores
- [ ] Automatic security scanning

---

**Last Updated:** October 14, 2025  
**Modified By:** Integrated linting and testing into Firebase hosting workflows

