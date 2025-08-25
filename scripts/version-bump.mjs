#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODULE_JSON_PATH = path.join(__dirname, '..', 'module.json');

function parseVersion(version) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return {
    major: parts[0],
    minor: parts[1],
    patch: parts[2]
  };
}

function formatVersion(versionObj) {
  return `${versionObj.major}.${versionObj.minor}.${versionObj.patch}`;
}

function bumpVersion(currentVersion, bumpType) {
  const version = parseVersion(currentVersion);

  switch (bumpType) {
    case 'major':
      return {
        major: version.major + 1,
        minor: 0,
        patch: 0
      };
    case 'minor':
      return {
        major: version.major,
        minor: version.minor + 1,
        patch: 0
      };
    case 'patch':
      return {
        major: version.major,
        minor: version.minor,
        patch: version.patch + 1
      };
    default:
      throw new Error(`Invalid bump type: ${bumpType}`);
  }
}

function updateModuleJson(moduleJson, newVersion) {
  // Update the version field
  moduleJson.version = newVersion;

  // Update the download URL to include the new version
  if (moduleJson.download) {
    // Replace the version in the download URL path
    moduleJson.download = moduleJson.download.replace(
      /\/releases\/download\/\d+\.\d+\.\d+\//,
      `/releases/download/${newVersion}/`
    );
  }

  return moduleJson;
}

function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  let bumpType = 'patch'; // default
  let specifiedTypes = [];

  for (const arg of args) {
    if (arg === '--major') specifiedTypes.push('major');
    else if (arg === '--minor') specifiedTypes.push('minor');
    else if (arg === '--patch') specifiedTypes.push('patch');
    else if (arg.startsWith('--')) {
      console.error(`❌ Unknown option: ${arg}`);
      console.error('Usage: npm run version:bump [--major|--minor|--patch]');
      process.exit(1);
    }
  }

  // Check for multiple bump types
  if (specifiedTypes.length > 1) {
    console.error('❌ Error: You can only bump the major, minor, or patch version, not a combination.');
    console.error('Usage: npm run version:bump [--major|--minor|--patch]');
    process.exit(1);
  }

  // Set bump type if specified
  if (specifiedTypes.length === 1) {
    bumpType = specifiedTypes[0];
  }

  try {
    // Read current module.json
    console.log('📖 Reading module.json...');
    const moduleJsonContent = fs.readFileSync(MODULE_JSON_PATH, 'utf8');
    const moduleJson = JSON.parse(moduleJsonContent);

    const currentVersion = moduleJson.version;
    console.log(`📋 Current version: ${currentVersion}`);

    // Bump version
    const newVersionObj = bumpVersion(currentVersion, bumpType);
    const newVersion = formatVersion(newVersionObj);

    console.log(`🚀 Bumping ${bumpType} version: ${currentVersion} → ${newVersion}`);

    // Update module.json
    const updatedModuleJson = updateModuleJson(moduleJson, newVersion);

    // Write back to file with proper formatting
    const updatedContent = JSON.stringify(updatedModuleJson, null, 2) + '\n';
    fs.writeFileSync(MODULE_JSON_PATH, updatedContent, 'utf8');

    console.log('✅ Version updated successfully!');
    console.log(`📄 Updated ${MODULE_JSON_PATH}`);
    console.log(`🔗 Download URL: ${updatedModuleJson.download}`);

  } catch (error) {
    console.error('❌ Error updating version:', error.message);
    process.exit(1);
  }
}

main();
