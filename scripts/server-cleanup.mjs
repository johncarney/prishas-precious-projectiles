#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_DATA_DIR = 'foundry-server';

function main() {
  console.log('🧹 Cleaning up Foundry server directory...\n');

  try {
    if (fs.existsSync(SERVER_DATA_DIR)) {
      fs.rmSync(SERVER_DATA_DIR, { recursive: true, force: true });
      console.log('✅ Foundry server directory removed successfully!');
    } else {
      console.log('ℹ️  Foundry server directory does not exist.');
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
}

main();
