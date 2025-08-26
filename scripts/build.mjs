#!/usr/bin/env node

import { execSync } from 'child_process';
import { rmSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(message) {
  log(`📋 ${message}`, colors.blue);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

async function build() {
  try {
    logStep('Starting build process...');

    // Step 1: Clean dist directory
    logStep('Cleaning dist directory...');
    const distPath = join(__dirname, '..', 'dist');
    if (statSync(distPath, { throwIfNoEntry: false })) {
      rmSync(distPath, { recursive: true, force: true });
    }
    mkdirSync(distPath, { recursive: true });
    logSuccess('Dist directory cleaned');

    // Step 2: Compile TypeScript
    logStep('Compiling TypeScript...');
    try {
      execSync('npx tsc', { stdio: 'inherit', cwd: join(__dirname, '..') });
      logSuccess('TypeScript compilation completed');
    } catch (error) {
      logError('TypeScript compilation failed');
      throw error;
    }

    // Step 3: Minify the compiled JavaScript
    logStep('Minifying JavaScript...');
    try {
      const modulePath = join(distPath, 'module.js');
      execSync(`npx terser "${modulePath}" -o "${modulePath}" --compress --mangle`, {
        stdio: 'inherit',
        cwd: join(__dirname, '..')
      });
      logSuccess('JavaScript minification completed');
    } catch (error) {
      logError('JavaScript minification failed');
      throw error;
    }

    // Step 4: Copy additional files
    logStep('Copying additional files...');
    const rootDir = join(__dirname, '..');
    const filesToCopy = ['module.json', 'README.md', 'LICENSE'];

    for (const file of filesToCopy) {
      const sourcePath = join(rootDir, file);
      const destPath = join(distPath, file);

      if (statSync(sourcePath, { throwIfNoEntry: false })) {
        copyFileSync(sourcePath, destPath);
        logSuccess(`Copied ${file}`);
      } else {
        logInfo(`Skipped ${file} (not found)`);
      }
    }

    // Step 5: Copy packs directory
    logStep('Copying packs directory...');
    const srcPacksPath = join(rootDir, 'src', 'packs');
    const distPacksPath = join(distPath, 'packs');

    if (statSync(srcPacksPath, { throwIfNoEntry: false })) {
      // Create packs directory
      mkdirSync(distPacksPath, { recursive: true });

      // Copy all files and subdirectories
      const copyRecursive = (src, dest) => {
        const entries = readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
          const srcPath = join(src, entry.name);
          const destPath = join(dest, entry.name);

          if (entry.isDirectory()) {
            mkdirSync(destPath, { recursive: true });
            copyRecursive(srcPath, destPath);
          } else {
            copyFileSync(srcPath, destPath);
          }
        }
      };

      copyRecursive(srcPacksPath, distPacksPath);
      logSuccess('Packs directory copied');
    } else {
      logInfo('No packs directory found in src');
    }

    // Step 6: Display build summary
    logStep('Build complete! Contents of dist directory:');
    const displayDirectoryContents = (dir, indent = '  ') => {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const icon = entry.isDirectory() ? '📁' : '📄';
        log(`${indent}${icon} ${entry.name}`);

        if (entry.isDirectory()) {
          displayDirectoryContents(join(dir, entry.name), indent + '  ');
        }
      }
    };

    displayDirectoryContents(distPath);

    logSuccess('Build completed successfully!');

  } catch (error) {
    logError(`Build failed: ${error.message}`);
    process.exit(1);
  }
}

build();
