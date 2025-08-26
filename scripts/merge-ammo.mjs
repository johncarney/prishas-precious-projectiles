#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
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

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

/**
 * Load JSON file and validate it contains an array of ammunition items
 */
function loadAmmunitionFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    if (!Array.isArray(data)) {
      throw new Error(`File does not contain an array: ${filePath}`);
    }

    // Validate that each item has the expected structure
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (!item.system) {
        logWarning(`Item at index ${i} in ${filePath} is missing system object - will be passed through`);
      }
    }

    return data;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in file: ${filePath}`);
    }
    throw error;
  }
}

/**
 * Merge multiple ammunition files
 */
function mergeAmmunitionFiles(inputFiles, outputFile) {
  logStep('Starting ammunition file merge...');

  if (inputFiles.length === 0) {
    throw new Error('No input files specified');
  }

  // Load all input files
  const fileData = [];
  for (const filePath of inputFiles) {
    logInfo(`Loading file: ${filePath}`);
    const data = loadAmmunitionFile(filePath);
    fileData.push(data);
    logSuccess(`Loaded ${data.length} items from ${filePath}`);
  }

  // Start with the rightmost file (last in the array)
  const rightmostFile = fileData[fileData.length - 1];
  const rightmostFileName = inputFiles[inputFiles.length - 1];

  logInfo(`Using ${rightmostFileName} as the base for ordering`);

  // Create a map to track items by slug for replacement logic
  const itemMap = new Map();
  let totalItems = 0;
  let replacedItems = 0;
  let addedItems = 0;
  let noSlugItems = 0;

  // First, process all files except the rightmost to build up the replacement map
  for (let fileIndex = 0; fileIndex < fileData.length - 1; fileIndex++) {
    const items = fileData[fileIndex];
    const fileName = inputFiles[fileIndex];

    logInfo(`Processing file ${fileIndex + 1}/${fileData.length - 1}: ${fileName}`);

    for (const item of items) {
      // Check if item has a slug for matching/replacement logic
      if (item.system && item.system.slug) {
        const slug = item.system.slug;
        itemMap.set(slug, item);
        logInfo(`Prepared replacement for slug: ${slug}`);
      } else {
        // Item has no slug - will be appended at the end
        const uniqueKey = `no-slug-${Date.now()}-${Math.random()}`;
        itemMap.set(uniqueKey, item);
        noSlugItems++;
        logInfo(`Prepared item without slug for appending: ${item.name || 'unnamed'}`);
      }
      totalItems++;
    }
  }

  // Now process the rightmost file to establish the order
  const orderedItems = [];
  const processedSlugs = new Set();

  logInfo(`Processing rightmost file: ${rightmostFileName}`);

  for (const item of rightmostFile) {
    if (item.system && item.system.slug) {
      const slug = item.system.slug;

      // Check if we have a replacement for this slug
      if (itemMap.has(slug)) {
        // Use the replacement from an earlier file
        const replacement = itemMap.get(slug);

        // Preserve the createdTime from the rightmost file's item
        if (item._stats && item._stats.createdTime) {
          replacement._stats = replacement._stats || {};
          replacement._stats.createdTime = item._stats.createdTime;
        }

        orderedItems.push(replacement);
        itemMap.delete(slug); // Remove from map so it's not appended later
        replacedItems++;
        logInfo(`Replaced item: ${replacement.name} (${slug}) - preserved createdTime from rightmost file`);
      } else {
        // Keep the original item from the rightmost file
        orderedItems.push(item);
        addedItems++;
        logInfo(`Kept original item: ${item.name} (${slug})`);
      }
      processedSlugs.add(slug);
    } else {
      // Item has no slug - add it to the ordered list
      orderedItems.push(item);
      noSlugItems++;
      logInfo(`Added item without slug to order: ${item.name || 'unnamed'}`);
    }
    totalItems++;
  }

  // Append any remaining items from earlier files that weren't matched
  for (const [key, item] of itemMap.entries()) {
    if (key.startsWith('no-slug-')) {
      // This is an item without a slug from an earlier file
      orderedItems.push(item);
      logInfo(`Appended item without slug from earlier file: ${item.name || 'unnamed'}`);
    } else {
      // This is an item with a slug that wasn't in the rightmost file
      orderedItems.push(item);
      addedItems++;
      logInfo(`Appended unmatched item: ${item.name} (${key})`);
    }
  }

  // Write merged data to output file
  writeFileSync(outputFile, JSON.stringify(orderedItems, null, 2), 'utf8');

  logSuccess(`Merge completed successfully!`);
  logInfo(`Output file: ${outputFile}`);
  logInfo(`Total items processed: ${totalItems}`);
  logInfo(`Items added: ${addedItems}`);
  logInfo(`Items replaced: ${replacedItems}`);
  logInfo(`Items without slugs: ${noSlugItems}`);
  logInfo(`Final item count: ${orderedItems.length}`);
}

// Command line interface
function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    logError('Usage: node merge-ammo.mjs <input-file1> [input-file2] ... <output-file>');
    logInfo('');
    logInfo('Examples:');
    logInfo('  node merge-ammo.mjs file1.json file2.json merged.json');
    logInfo('  node merge-ammo.mjs arrows.json bolts.json darts.json all-ammo.json');
    logInfo('');
    logInfo('The merge preserves the order of the rightmost file.');
    logInfo('Items in earlier files replace items with the same slug in the rightmost file.');
    logInfo('Unmatched items from earlier files are appended at the end.');
    logInfo('Items without slugs are passed through unchanged.');
    logInfo('When replacing items, the createdTime from the rightmost file is preserved.');
    process.exit(1);
  }

  // Last argument is the output file
  const outputFile = args[args.length - 1];
  const inputFiles = args.slice(0, -1);

  // Resolve relative paths
  const resolvedInputFiles = inputFiles.map(file => join(process.cwd(), file));
  const resolvedOutputFile = join(process.cwd(), outputFile);

  logStep('Ammunition File Merger');
  logInfo(`Input files: ${inputFiles.join(', ')}`);
  logInfo(`Output file: ${outputFile}`);
  log('');

  try {
    mergeAmmunitionFiles(resolvedInputFiles, resolvedOutputFile);
  } catch (error) {
    logError(`Merge failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { mergeAmmunitionFiles };
