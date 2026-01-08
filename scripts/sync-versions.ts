#!/usr/bin/env bun

/**
 * Sync all package versions to a single version
 *
 * This script ensures all packages in the monorepo have the same version,
 * implementing a "fixed versioning" strategy like Next.js, Angular, etc.
 *
 * Usage:
 *   bun run scripts/sync-versions.ts [version]
 *   bun run scripts/sync-versions.ts 0.7.0
 *   bun run scripts/sync-versions.ts 0.7.0 --dry-run
 */

import { join } from 'node:path';

const PACKAGES_DIR = join(import.meta.dir, '..', 'packages');
const ROOT_PKG_PATH = join(import.meta.dir, '..', 'package.json');

// Order matters: dependencies must be processed first
const PACKAGE_DIRS = ['shared', 'core', 'cli', 'mcp-server', 'vscode-extension'];

interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

async function readPackageJson(path: string): Promise<PackageJson> {
  return Bun.file(path).json();
}

async function writePackageJson(path: string, pkg: PackageJson): Promise<void> {
  await Bun.write(path, JSON.stringify(pkg, null, 2) + '\n');
}

async function getCurrentVersions(): Promise<
  Map<string, { name: string; version: string; path: string }>
> {
  const versions = new Map<string, { name: string; version: string; path: string }>();

  for (const dir of PACKAGE_DIRS) {
    const pkgPath = join(PACKAGES_DIR, dir, 'package.json');
    const pkg = await readPackageJson(pkgPath);
    versions.set(pkg.name, { name: pkg.name, version: pkg.version, path: pkgPath });
  }

  return versions;
}

async function syncVersions(targetVersion: string, dryRun: boolean = false): Promise<void> {
  console.log(
    `\n🔄 Syncing all packages to version ${targetVersion}${dryRun ? ' (dry run)' : ''}\n`
  );

  const currentVersions = await getCurrentVersions();
  const packageNames = new Set(Array.from(currentVersions.keys()));

  // Update root package.json
  const rootPkg = await readPackageJson(ROOT_PKG_PATH);
  console.log(`📦 Root: ${rootPkg.version} → ${targetVersion}`);
  if (!dryRun) {
    rootPkg.version = targetVersion;
    await writePackageJson(ROOT_PKG_PATH, rootPkg);
  }

  // Update each package
  for (const dir of PACKAGE_DIRS) {
    const pkgPath = join(PACKAGES_DIR, dir, 'package.json');
    const pkg = await readPackageJson(pkgPath);

    console.log(`📦 ${pkg.name}: ${pkg.version} → ${targetVersion}`);

    if (!dryRun) {
      pkg.version = targetVersion;

      // Update internal dependencies to use exact same version with workspace:^
      for (const depType of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
        const deps = pkg[depType];
        if (!deps) continue;

        for (const [name, version] of Object.entries(deps)) {
          if (packageNames.has(name) && !version.startsWith('workspace:')) {
            // Convert to workspace protocol if it's an internal package
            console.log(`   ↳ ${name}: ${version} → workspace:^`);
            deps[name] = 'workspace:^';
          }
        }
      }

      await writePackageJson(pkgPath, pkg);
    }
  }

  console.log(
    `\n✅ ${dryRun ? 'Would sync' : 'Synced'} ${PACKAGE_DIRS.length + 1} packages to version ${targetVersion}\n`
  );

  if (!dryRun) {
    console.log('💡 Next steps:');
    console.log('   1. Run: bun install');
    console.log('   2. Run: bun run build');
    console.log('   3. Run: bun run release');
  }
}

// Main
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const version = args.find((arg) => !arg.startsWith('--'));

if (!version) {
  // If no version provided, show current versions
  console.log('\n📊 Current package versions:\n');
  const versions = await getCurrentVersions();
  for (const [name, info] of versions) {
    console.log(`   ${name}: ${info.version}`);
  }
  const rootPkg = await readPackageJson(ROOT_PKG_PATH);
  console.log(`\n   Root (${rootPkg.name}): ${rootPkg.version}`);
  console.log('\n💡 Usage: bun run scripts/sync-versions.ts <version> [--dry-run]\n');
} else {
  // Validate version format
  if (!/^\d+\.\d+\.\d+(-\w+(\.\d+)?)?$/.test(version)) {
    console.error(`❌ Invalid version format: ${version}`);
    console.error('   Expected: x.y.z or x.y.z-tag.n (e.g., 0.7.0 or 0.7.0-beta.1)');
    process.exit(1);
  }

  await syncVersions(version, dryRun);
}
