#!/usr/bin/env node

import { writeFileSync, mkdirSync, statSync, readdirSync } from 'fs';
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
 * Extract all records from a LevelDB database
 * @param {string} dbPath - Path to the LevelDB database directory
 * @param {string} outputPath - Path to the output JSON file
 */
async function extractLevelDB(dbPath, outputPath) {
  let db = null;

  try {
    logStep('Starting LevelDB extraction...');

    // Check if database path exists
    if (!statSync(dbPath, { throwIfNoEntry: false })) {
      throw new Error(`Database path does not exist: ${dbPath}`);
    }

    logInfo(`Reading LevelDB from: ${dbPath}`);

    // List files in the directory for debugging
    const files = readdirSync(dbPath);
    logInfo(`Files in directory: ${files.join(', ')}`);

    // Check if this looks like a LevelDB database
    const hasLevelDBFiles = files.some(file => file.startsWith('MANIFEST-') || file.endsWith('.ldb'));
    if (!hasLevelDBFiles) {
      throw new Error(`Path does not appear to be a LevelDB database. Expected MANIFEST-* or *.ldb files, but found: ${files.join(', ')}`);
    }

    // Open the LevelDB database
    db = new ClassicLevel(dbPath, { valueEncoding: 'json' });

    logStep('Reading all records from LevelDB...');

    // Extract all records
    const records = [];
    const errors = [];
    let recordCount = 0;
    let totalKeys = 0;

    // Use a proper iterator approach
    const iterator = db.iterator();

    try {
      for await (const [key, value] of iterator) {
        totalKeys++;

        try {
          // Skip only truly internal LevelDB keys, but include !items! and !folders! keys
          if (key.startsWith('_') || key === 'CURRENT' || key === 'LOCK' || key === 'LOG') {
            logInfo(`Skipping internal key: ${key}`);
            continue;
          }

          logInfo(`Processing key: ${key}`);

          // Add metadata about the record
          const record = {
            ...value,
            _metadata: {
              key: key
            }
          };

          records.push(record);
          recordCount++;

          if (recordCount % 10 === 0) {
            logInfo(`Extracted ${recordCount} records...`);
          }

        } catch (error) {
          logError(`Error processing record ${key}: ${error.message}`);
          errors.push(`Error processing ${key}: ${error.message}`);
        }
      }
    } finally {
      // Close the iterator
      await iterator.close();
    }

    logInfo(`Total keys found: ${totalKeys}`);
    logSuccess(`Extracted ${recordCount} records from LevelDB`);

    // Create output directory if it doesn't exist
    const outputDir = dirname(outputPath);
    if (!statSync(outputDir, { throwIfNoEntry: false })) {
      mkdirSync(outputDir, { recursive: true });
      logInfo(`Created output directory: ${outputDir}`);
    }

    // Write the records array directly
    logStep('Writing output file...');
    writeFileSync(outputPath, JSON.stringify(records, null, 2), 'utf8');

    logSuccess(`Extraction completed successfully!`);
    logInfo(`Output file: ${outputPath}`);
    logInfo(`Total records extracted: ${records.length}`);

    if (errors.length > 0) {
      logWarning(`${errors.length} errors encountered during extraction`);
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

      // Show some sample keys
      // logStep('Sample record keys:');
      // const sampleKeys = records.slice(0, 5).map(r => r._metadata.key);
      // sampleKeys.forEach(key => {
      //   logInfo(`  ${key}`);
      // });
    }

  } catch (error) {
    logError(`Extraction failed: ${error.message}`);
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
    logError('Usage: node extract-compendium.mjs <leveldb-path> <output-file>');
    logInfo('');
    logInfo('Examples:');
    logInfo('  node extract-compendium.mjs ./dist/packs/prishas-precious-projectiles ./analysis/ammunition.json');
    logInfo('  node extract-compendium.mjs ./foundry-server/data/Data/packs/pf2e.equipment-srd ./analysis/equipment.json');
    logInfo('');
    logInfo('The script will:');
    logInfo('  1. Open the LevelDB database from the specified path');
    logInfo('  2. Extract all records into a JSON array');
    logInfo('  3. Save the array to the output JSON file');
    logInfo('  4. Create the output directory if it doesn\'t exist');
    process.exit(1);
  }

  const [dbPath, outputPath] = args;

  // Resolve relative paths
  const resolvedDbPath = join(process.cwd(), dbPath);
  const resolvedOutputPath = join(process.cwd(), outputPath);

  logStep('LevelDB Extractor');
  logInfo(`Input: ${resolvedDbPath}`);
  logInfo(`Output: ${resolvedOutputPath}`);
  log('');

  extractLevelDB(resolvedDbPath, resolvedOutputPath);
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { extractLevelDB };
