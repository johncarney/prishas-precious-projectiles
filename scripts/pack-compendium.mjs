#!/usr/bin/env node

import { readFileSync, mkdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ClassicLevel } from 'classic-level';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

/**
 * Pack records from a JSON file into a LevelDB database
 * @param {string} jsonPath - Path to the JSON file containing records
 * @param {string} dbPath - Path to the LevelDB database directory
 */
async function packLevelDB(jsonPath, dbPath) {
  let db = null;

  try {
    logStep('Starting LevelDB packing...');

    // Check if JSON file exists
    if (!statSync(jsonPath, { throwIfNoEntry: false })) {
      throw new Error(`JSON file does not exist: ${jsonPath}`);
    }

    logInfo(`Reading records from: ${jsonPath}`);

    // Read and parse the JSON file
    const jsonContent = readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(jsonContent);

    // Validate the structure - expect either an array directly or an object with records array
    let records;
    if (Array.isArray(data)) {
      records = data;
    } else if (data.records && Array.isArray(data.records)) {
      records = data.records;
    } else {
      throw new Error('JSON file must contain an array of records or an object with a "records" array');
    }

    logInfo(`Found ${records.length} records to pack`);

    // Create database directory if it doesn't exist
    if (!statSync(dbPath, { throwIfNoEntry: false })) {
      mkdirSync(dbPath, { recursive: true });
      logInfo(`Created database directory: ${dbPath}`);
    }

    // Open the LevelDB database
    db = new ClassicLevel(dbPath, { valueEncoding: 'json' });

    logStep('Packing records into LevelDB...');

    // Pack all records
    const errors = [];
    let recordCount = 0;

    for (const record of records) {
      try {
        // Extract the key from metadata or generate one
        let key;
        if (record._metadata && record._metadata.key) {
          key = record._metadata.key;
        } else if (record._id) {
          key = `!items!${record._id}`;
        } else {
          // Generate a key based on the record type and name
          const type = record.type || 'unknown';
          const name = record.name || 'unnamed';
          const id = record._id || Math.random().toString(36).substr(2, 9);
          key = `!items!${id}`;
        }

        // Remove metadata before storing (to keep the database clean)
        const cleanRecord = { ...record };
        delete cleanRecord._metadata;

        // Store the record
        await db.put(key, cleanRecord);
        recordCount++;

        if (recordCount % 10 === 0) {
          logInfo(`Packed ${recordCount} records...`);
        }

      } catch (error) {
        logError(`Error packing record: ${error.message}`);
        errors.push(`Error packing record: ${error.message}`);
      }
    }

    logSuccess(`Packed ${recordCount} records into LevelDB`);

    if (errors.length > 0) {
      logWarning(`${errors.length} errors encountered during packing`);
      logInfo('Check the console output for error details');
    }

    // Display some statistics
    if (records.length > 0) {
      logStep('Record statistics:');

      // Count by type
      const typeCounts = {};
      const nameExamples = {};

      records.forEach(record => {
        const type = record.type || 'unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;

        if (!nameExamples[type]) {
          nameExamples[type] = record.name || record._id || 'unnamed';
        }
      });

      Object.entries(typeCounts).forEach(([type, count]) => {
        logInfo(`  ${type}: ${count} records (e.g., "${nameExamples[type]}")`);
      });
    }

    logSuccess(`Packing completed successfully!`);
    logInfo(`Database location: ${dbPath}`);

  } catch (error) {
    logError(`Packing failed: ${error.message}`);
    process.exit(1);
  } finally {
    // Always close the database
    if (db) {
      try {
        await db.close();
      } catch (error) {
        logWarning(`Error closing database: ${error.message}`);
      }
    }
  }
}

// Command line interface
function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    logError('Usage: node pack-compendium.mjs <json-file> <leveldb-path>');
    logInfo('');
    logInfo('Examples:');
    logInfo('  node pack-compendium.mjs ./analysis/ammunition.json ./dist/packs/prishas-precious-projectiles');
    logInfo('  node pack-compendium.mjs ./analysis/equipment.json ./foundry-server/data/Data/packs/custom-equipment');
    logInfo('');
    logInfo('The script will:');
    logInfo('  1. Read records from the specified JSON file (array or object with records array)');
    logInfo('  2. Pack all records into a LevelDB database');
    logInfo('  3. Create the database directory if it doesn\'t exist');
    logInfo('  4. Use existing keys from metadata or generate new ones');
    process.exit(1);
  }

  const [jsonPath, dbPath] = args;

  // Resolve relative paths
  const resolvedJsonPath = join(process.cwd(), jsonPath);
  const resolvedDbPath = join(process.cwd(), dbPath);

  logStep('LevelDB Packer');
  logInfo(`Input: ${resolvedJsonPath}`);
  logInfo(`Output: ${resolvedDbPath}`);
  log('');

  packLevelDB(resolvedJsonPath, resolvedDbPath);
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { packLevelDB };
