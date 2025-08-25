#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = 'src';
const DIST_DIR = 'dist';

function copyFileSync(source, target) {
  const targetFile = target;

  // Ensure target directory exists
  const targetDir = path.dirname(targetFile);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.copyFileSync(source, targetFile);
}

function copyDirectorySync(source, target) {
  // Create target directory if it doesn't exist
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  // Read source directory
  const files = fs.readdirSync(source);

  for (const file of files) {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);

    const stat = fs.statSync(sourcePath);

    if (stat.isDirectory()) {
      copyDirectorySync(sourcePath, targetPath);
    } else {
      copyFileSync(sourcePath, targetPath);
    }
  }
}

function main() {
  console.log('🧹 Cleaning dist directory...');

  // Clean dist directory
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });

  console.log('📁 Copying files from src to dist...');

  // Copy all files from src to dist
  if (fs.existsSync(SRC_DIR)) {
    copyDirectorySync(SRC_DIR, DIST_DIR);
  }

  console.log('📄 Copying additional files...');

  // Copy additional files from root
  const additionalFiles = ['module.json', 'README.md', 'LICENSE'];

  for (const file of additionalFiles) {
    if (fs.existsSync(file)) {
      copyFileSync(file, path.join(DIST_DIR, file));
      console.log(`  ✅ Copied ${file}`);
    } else {
      console.log(`  ⚠️  File not found: ${file}`);
    }
  }

  console.log('\n📋 Build complete! Contents of dist directory:');

  // Show contents for debugging
  const distContents = fs.readdirSync(DIST_DIR);
  for (const item of distContents) {
    const itemPath = path.join(DIST_DIR, item);
    const stat = fs.statSync(itemPath);
    const type = stat.isDirectory() ? '📁' : '📄';
    console.log(`  ${type} ${item}`);

    // If it's a directory, show its contents
    if (stat.isDirectory()) {
      try {
        const subContents = fs.readdirSync(itemPath);
        for (const subItem of subContents) {
          console.log(`    📄 ${subItem}`);
        }
      } catch (err) {
        console.log(`    ⚠️  Error reading directory: ${err.message}`);
      }
    }
  }

  console.log('\n✅ Build completed successfully!');
}

main();
