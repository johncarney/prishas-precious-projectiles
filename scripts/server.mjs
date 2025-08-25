#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_APP_DIR = path.join(__dirname, '..', 'foundry-server', 'app');
const SERVER_DATA_DIR = path.join(__dirname, '..', 'foundry-server', 'data');
const SERVER_MAIN_JS = path.join(SERVER_APP_DIR, 'main.js');

function main() {
  console.log('🚀 Starting Foundry VTT server...\n');

  try {
    // Check if Foundry server app exists
    if (!fs.existsSync(SERVER_MAIN_JS)) {
      console.error('❌ Foundry server not found at:', SERVER_MAIN_JS);
      console.error('💡 Please ensure Foundry VTT is installed in foundry-server/app/');
      process.exit(1);
    }

    // Check if server data directory exists
    if (!fs.existsSync(SERVER_DATA_DIR)) {
      console.error('❌ Server data directory not found at:', SERVER_DATA_DIR);
      console.error('💡 Please run "npm run server:init" first to set up the server');
      process.exit(1);
    }

    // Check if development world exists
    const worldDir = path.join(SERVER_DATA_DIR, 'Data', 'worlds', 'development');
    if (!fs.existsSync(worldDir)) {
      console.error('❌ Development world not found at:', worldDir);
      console.error('💡 Please run "npm run server:init" first to set up the world');
      process.exit(1);
    }

    // Check if PF2e system exists
    const pf2eDir = path.join(SERVER_DATA_DIR, 'Data', 'systems', 'pf2e');
    if (!fs.existsSync(pf2eDir)) {
      console.error('❌ PF2e system not found at:', pf2eDir);
      console.error('💡 Please run "npm run server:init" first to install the system');
      process.exit(1);
    }

    // Check if module symlink exists
    const moduleDir = path.join(SERVER_DATA_DIR, 'Data', 'modules', 'prishas-precious-projectiles');
    if (!fs.existsSync(moduleDir)) {
      console.error('❌ Module symlink not found at:', moduleDir);
      console.error('💡 Please run "npm run server:init" first to set up the module');
      process.exit(1);
    }

    console.log('✅ All prerequisites met!');
    console.log('🌍 Starting Foundry server with development world...');
    console.log('🔗 Server will be available at: http://localhost:30000');
    console.log('🔑 Admin password: foundry');
    console.log('📁 Data path:', SERVER_DATA_DIR);
    console.log('');

    // Start the Foundry server
    const command = `node "${SERVER_MAIN_JS}" --world=development --dataPath="${SERVER_DATA_DIR}" --adminPassword=foundry --hotReload`;

    console.log('🚀 Executing:', command);
    console.log('');

    execSync(command, {
      stdio: 'inherit',
      cwd: SERVER_APP_DIR
    });

  } catch (error) {
    if (error.status === 1) {
      // This is our own exit, don't show error
      return;
    }
    console.error('\n❌ Error starting Foundry server:', error.message);
    process.exit(1);
  }
}

main();
