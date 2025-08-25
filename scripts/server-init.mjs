#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_DATA_DIR = 'foundry-server/data/Data';
const SYSTEMS_DIR = path.join(SERVER_DATA_DIR, 'systems');
const MODULE_DIR = path.join(SERVER_DATA_DIR, 'modules/prishas-precious-projectiles');
const PROJECT_DIST_DIR = path.resolve('dist');

async function getLatestPF2eRelease() {
  return new Promise((resolve, reject) => {
    https.get('https://api.github.com/repos/foundryvtt/pf2e/releases/latest', {
      headers: {
        'User-Agent': 'Prishas-Precious-Projectiles-Server-Init'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          resolve(release);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('🚀 Initializing Foundry server with PF2e system...\n');

  try {
    // Create server data directory structure
    console.log('📁 Creating server data directory structure...');
    fs.mkdirSync(SERVER_DATA_DIR, { recursive: true });
    fs.mkdirSync(SYSTEMS_DIR, { recursive: true });
    fs.mkdirSync(path.dirname(MODULE_DIR), { recursive: true });

    // Get latest PF2e release
    console.log('🔍 Fetching latest PF2e system release...');
    const release = await getLatestPF2eRelease();
    const downloadUrl = release.assets.find(asset =>
      asset.name === 'pf2e.zip'
    )?.browser_download_url;

    if (!downloadUrl) {
      throw new Error('Could not find PF2e system download URL');
    }

    console.log(`📦 Downloading PF2e system v${release.tag_name}...`);
    const zipPath = path.join(SERVER_DATA_DIR, 'pf2e-system.zip');
    console.log(`Download URL: ${downloadUrl}`);
    console.log(`Saving to: ${zipPath}`);

    // Use curl for more reliable downloads
    execSync(`curl -L -o "${zipPath}" "${downloadUrl}"`, { stdio: 'inherit' });

    // Extract PF2e system
    console.log('📂 Extracting PF2e system...');
    console.log(`Extracting from: ${zipPath}`);
    console.log(`Extracting to: ${SYSTEMS_DIR}`);
    execSync(`unzip -q "${zipPath}" -d "${SYSTEMS_DIR}"`, { stdio: 'inherit' });

    // Clean up zip file
    console.log('🗑️  Cleaning up zip file...');
    fs.unlinkSync(zipPath);

    // Find the system directory by reading system.json
    console.log('🔍 Determining system directory name...');

    // First check if system.json is directly in the systems directory
    const directSystemJson = path.join(SYSTEMS_DIR, 'system.json');
    let systemDir = null;
    let systemJsonPath = null;

    if (fs.existsSync(directSystemJson)) {
      try {
        const systemJson = JSON.parse(fs.readFileSync(directSystemJson, 'utf8'));
        if (systemJson.id === 'pf2e') {
          // System files are directly in the systems directory
          systemDir = '';
          systemJsonPath = directSystemJson;
          console.log('📂 PF2e system files are directly in systems directory');
        }
      } catch (err) {
        console.log(`  ⚠️  Could not read system.json: ${err.message}`);
      }
    }

    // If not found directly, check subdirectories
    if (!systemDir) {
      const systemDirs = fs.readdirSync(SYSTEMS_DIR);
      for (const dir of systemDirs) {
        const potentialSystemJson = path.join(SYSTEMS_DIR, dir, 'system.json');
        if (fs.existsSync(potentialSystemJson)) {
          try {
            const systemJson = JSON.parse(fs.readFileSync(potentialSystemJson, 'utf8'));
            if (systemJson.id === 'pf2e') {
              systemDir = dir;
              systemJsonPath = potentialSystemJson;
              break;
            }
          } catch (err) {
            console.log(`  ⚠️  Could not read system.json in ${dir}: ${err.message}`);
          }
        }
      }
    }

    if (!systemDir && !systemJsonPath) {
      throw new Error('Could not find PF2e system.json after extraction');
    }

        let PF2E_SYSTEM_DIR = systemDir ? path.join(SYSTEMS_DIR, systemDir) : SYSTEMS_DIR;
    console.log(`📂 Found PF2e system at: ${PF2E_SYSTEM_DIR}`);

    // If system files are directly in systems directory, move them to pf2e subdirectory
    if (!systemDir) {
      console.log('📁 Creating pf2e subdirectory and moving system files...');
      const pf2eDir = path.join(SYSTEMS_DIR, 'pf2e');
      fs.mkdirSync(pf2eDir, { recursive: true });

      // Move all files from systems directory to pf2e subdirectory
      const files = fs.readdirSync(SYSTEMS_DIR);
      for (const file of files) {
        const sourcePath = path.join(SYSTEMS_DIR, file);
        const targetPath = path.join(pf2eDir, file);

        // Skip the pf2e directory itself
        if (file === 'pf2e') continue;

        const stat = fs.statSync(sourcePath);
        if (stat.isDirectory()) {
          // Move directory
          fs.renameSync(sourcePath, targetPath);
        } else {
          // Move file
          fs.renameSync(sourcePath, targetPath);
        }
      }

      // Update the system directory path
      PF2E_SYSTEM_DIR = pf2eDir;
      console.log(`📂 Moved PF2e system to: ${PF2E_SYSTEM_DIR}`);
    }

    // Build the module if dist doesn't exist
    if (!fs.existsSync(PROJECT_DIST_DIR)) {
      console.log('🔨 Building module...');
      execSync('npm run build', { stdio: 'inherit' });
    }

    // Create symlink for the module
    console.log('🔗 Creating module symlink...');
    if (fs.existsSync(MODULE_DIR)) {
      fs.rmSync(MODULE_DIR, { recursive: true, force: true });
    }
    fs.symlinkSync(PROJECT_DIST_DIR, MODULE_DIR, 'dir');

    console.log('\n✅ Foundry server initialization complete!');
    console.log(`📂 PF2e system installed at: ${PF2E_SYSTEM_DIR}`);
    console.log(`🔗 Module symlinked at: ${MODULE_DIR}`);
    console.log(`📋 PF2e version: ${release.tag_name}`);
    console.log('\n💡 You can now start your Foundry server and the module will be available!');

  } catch (error) {
    console.error('\n❌ Error during server initialization:', error.message);
    process.exit(1);
  }
}

main();
