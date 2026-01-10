# CI/CD Integration Guide: Test Reporting

This guide explains how to integrate Cortex's test reporting (`bun run test:report`) with GitHub Actions to visualize test results and code coverage.

## Overview

We utilize two primary methods for visibility:
1.  **Pull Request Comments**: Immediate feedback on PRs via [EnricoMi/publish-unit-test-result-action](https://github.com/EnricoMi/publish-unit-test-result-action).
2.  **GitHub Pages Report**: A persistent HTML coverage site deployed to GitHub Pages.

## Prerequisites

1.  Enable **GitHub Pages** in your repository settings:
    - Go to `Settings` -> `Pages`.
    - Source: `GitHub Actions`.
2.  Ensure `bun` is installed in your runner (handled by `oven-sh/setup-bun`).

## 1. Updating the Main Pipeline (`unified.yml`)

To see test results in your PRs, update your `ci` job in `.github/workflows/unified.yml`.

**Replace the "Run tests" step with:**

```yaml
      - name: Run tests with reporting
        if: matrix.task == 'test'
        run: bun run test:report

      - name: Publish Test Results
        if: matrix.task == 'test'
        uses: EnricoMi/publish-unit-test-result-action@v2
        if: always() # Run even if tests fail
        with:
          files: "reports/junit.xml"
```

## 2. Automated Integration (Implemented)

We have updated `.github/workflows/deploy-web.yml` to automatically:
1.  Run `test:report` in the `cortex` directory during deployment.
2.  Copy the generated HTML report to `apps/web/public/coverage/`.
3.  Deploy it along with your website to Cloudflare Pages.

**Result:**
Your coverage report is now automatically built and deployed with every web update.
Accessible at: `https://cortex.ecuabyte.lat/coverage/` (after next deploy).
