#!/usr/bin/env bun

/**
 * Custom publish script for Bun workspaces
 *
 * This script uses `bun publish` instead of `changeset publish` because:
 * - Changesets doesn't support Bun's workspace protocol
 * - `bun publish` properly resolves `workspace:^` to actual semver versions
 *
 * @see https://github.com/oven-sh/bun/issues/24687
 * @see https://github.com/changesets/changesets/discussions/1389
 */

import { join } from 'node:path';
import { $ } from 'bun';

const PACKAGES_DIR = join(import.meta.dir, '..', 'packages');

// Order matters: dependencies must be published first
const PUBLISH_ORDER = ['shared', 'core', 'cli', 'mcp-server', 'vscode-extension'];

interface PublishResult {
  package: string;
  success: boolean;
  message: string;
}

async function getPackageInfo(dir: string): Promise<{ name: string; version: string } | null> {
  try {
    const pkgPath = join(PACKAGES_DIR, dir, 'package.json');
    const pkg = await Bun.file(pkgPath).json();
    return { name: pkg.name, version: pkg.version };
  } catch {
    return null;
  }
}

async function isVersionPublished(name: string, version: string): Promise<boolean> {
  try {
    const result = await $`npm view ${name}@${version} version`.quiet();
    return result.text().trim() === version;
  } catch {
    return false;
  }
}

async function publishPackage(dir: string): Promise<PublishResult> {
  const pkgPath = join(PACKAGES_DIR, dir);
  const info = await getPackageInfo(dir);

  if (!info) {
    return { package: dir, success: false, message: 'Could not read package.json' };
  }

  // Check if already published
  if (await isVersionPublished(info.name, info.version)) {
    return {
      package: info.name,
      success: true,
      message: `Already published at ${info.version}`,
    };
  }

  console.log(`📦 Publishing ${info.name}@${info.version}...`);

  try {
    // Use bun publish which properly resolves workspace: protocol
    await $`cd ${pkgPath} && bun publish --access public`.quiet();
    console.log(`✅ ${info.name}@${info.version} published successfully`);
    return {
      package: info.name,
      success: true,
      message: `Published ${info.version}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to publish ${info.name}: ${message}`);
    return {
      package: info.name,
      success: false,
      message,
    };
  }
}

async function main() {
  console.log('🚀 Starting Bun workspace publish...\n');

  const results: PublishResult[] = [];

  for (const dir of PUBLISH_ORDER) {
    const result = await publishPackage(dir);
    results.push(result);

    // Stop on failure for dependent packages
    if (!result.success && !result.message.includes('Already published')) {
      console.error(`\n❌ Stopping due to failure in ${result.package}`);
      break;
    }
  }

  console.log('\n📊 Publish Summary:');
  console.log('─'.repeat(50));

  const published = results.filter((r) => r.success && r.message.includes('Published'));
  const skipped = results.filter((r) => r.success && r.message.includes('Already'));
  const failed = results.filter((r) => !r.success);

  for (const r of results) {
    const icon = r.success ? '✅' : '❌';
    console.log(`${icon} ${r.package}: ${r.message}`);
  }

  console.log('─'.repeat(50));
  console.log(
    `Published: ${published.length}, Skipped: ${skipped.length}, Failed: ${failed.length}`
  );

  // Create git tags for published packages
  if (published.length > 0) {
    console.log('\n🏷️  Creating git tags...');
    for (const r of published) {
      const info = await getPackageInfo(
        PUBLISH_ORDER.find((d) => results.find((res) => res.package.includes(d) && res === r)) || ''
      );
      if (info) {
        try {
          await $`git tag ${info.name}@${info.version}`.quiet();
          console.log(`   Tagged: ${info.name}@${info.version}`);
        } catch {
          // Tag might already exist
        }
      }
    }

    // Push tags
    try {
      await $`git push --tags`.quiet();
      console.log('   Pushed tags to remote');
    } catch {
      console.log('   Could not push tags (might need permissions)');
    }
  }

  // Output for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    const publishedPackages = JSON.stringify(
      await Promise.all(
        published.map(async (r) => {
          const dir = PUBLISH_ORDER.find((d) => r.package.includes(d.replace('-', ''))) || '';
          const info = await getPackageInfo(dir);
          return info ? { name: info.name, version: info.version } : null;
        })
      ).then((arr) => arr.filter(Boolean))
    );

    await Bun.write(
      process.env.GITHUB_OUTPUT,
      `published=${published.length > 0}\npublishedPackages=${publishedPackages}\n`
    );
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main();
