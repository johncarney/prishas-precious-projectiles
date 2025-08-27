#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import jsyaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

/**
 * Generate a random alphanumeric string ID like Foundry VTT does
 * @param {number} length - The length of the random string (default: 16)
 * @returns {string} A string containing random letters (A-Z, a-z) and numbers (0-9)
 */
function generateFoundryId(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(length);
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }

  return result;
}

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
 * Convert text to sentence case
 */
function toSentenceCase(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convert text to slug format
 */
function toSlug(text) {
  if (!text) return text;
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
}

/**
 * Clean whitespace in text
 */
function cleanWhitespace(text) {
  if (!text) return text;
  return text
    .replace(/\s+\./g, '.') // Remove spaces before periods
    .replace(/\s+/g, ' ') // Fold multiple whitespace into single space
    .trim();
}

/**
 * Load and parse YAML files
 */
function loadYamlData() {
  const rootDir = join(__dirname, '..');

  const ammunitionTypesPath = join(rootDir, 'src', 'ammunition-types.yml');
  const weaponMaterialsPath = join(rootDir, 'src', 'weapon-materials.yml');

  const ammunitionTypes = jsyaml.load(readFileSync(ammunitionTypesPath, 'utf8'));
  const weaponMaterials = jsyaml.load(readFileSync(weaponMaterialsPath, 'utf8'));

  return { ammunitionTypes, weaponMaterials };
}

/**
 * Load compendium data and create folder lookup map
 */
function loadCompendiumData() {
  const rootDir = join(__dirname, '..');
  const compendiumPath = join(rootDir, 'src', 'packs', 'prishas-precious-projectiles.json');

  const compendiumData = JSON.parse(readFileSync(compendiumPath, 'utf8'));

  // Create a map of folder names to UUIDs
  const folderMap = new Map();
  // Create a map of item slugs to UUIDs for duplicate detection
  const itemSlugMap = new Map();

  for (const record of compendiumData) {
    // Check if this is a folder record (has _metadata.key starting with "!folders!")
    if (record._metadata && record._metadata.key && record._metadata.key.startsWith('!folders!')) {
      folderMap.set(record.name, record._id);
    }
    // Check if this is an item record (has _metadata.key starting with "!items!")
    else if (record._metadata && record._metadata.key && record._metadata.key.startsWith('!items!')) {
      if (record.system && record.system.slug) {
        itemSlugMap.set(record.system.slug, record._id);
      }
    }
  }

  return { folderMap, itemSlugMap, compendiumData };
}

/**
 * Generate a new folder record
 */
function generateFolder(folderName) {
  const folderId = generateFoundryId();
  const now = Date.now();

  const folder = {
    name: folderName,
    sorting: "a",
    folder: null,
    type: "Item",
    _id: folderId,
    description: "",
    sort: 100000,
    color: null,
    flags: {},
    _stats: {
      compendiumSource: null,
      duplicateSource: null,
      coreVersion: "12.327",
      systemId: "pf2e",
      systemVersion: "6.0.4",
      createdTime: now,
      modifiedTime: now
    },
    _metadata: {
      key: `!folders!${folderId}`
    }
  };

  return folder;
}

/**
 * Load existing output file if it exists
 */
function loadExistingOutput(outputPath) {
  if (!existsSync(outputPath)) {
    return [];
  }

  try {
    const content = readFileSync(outputPath, 'utf8');
    const data = JSON.parse(content);

    if (!Array.isArray(data)) {
      throw new Error(`Output file does not contain an array: ${outputPath}`);
    }

    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in output file: ${outputPath}`);
    }
    throw error;
  }
}

/**
 * Generate ammunition item JSON
 */
function generateAmmunitionItem(ammunitionType, material, grade, folderMap, itemSlugMap, compendiumData, newFolders) {
  try {
    const { ammunitionTypes, weaponMaterials } = loadYamlData();

    // Validate inputs
    if (!ammunitionTypes[ammunitionType]) {
      throw new Error(`Unknown ammunition type: ${ammunitionType}`);
    }

    if (!weaponMaterials[material]) {
      throw new Error(`Unknown material: ${material}`);
    }

    if (!weaponMaterials[material].grades[grade]) {
      throw new Error(`Unknown grade: ${grade} for material ${material}`);
    }

    const ammoConfig = ammunitionTypes[ammunitionType];
    const materialConfig = weaponMaterials[material];
    const gradeConfig = materialConfig.grades[grade];

    logInfo(`Generating ${material} ${ammunitionType} (${grade})...`);

    // Process templates
    let name = ammoConfig.title_template || "{material} {name} ({grade})";
    let description = ammoConfig.description_template || "Standard ammunition.";

    // Get weapon and ammo types
    const weaponType = ammoConfig.weapon_type || ammunitionType;
    const ammoType = ammoConfig.ammo_type || ammunitionType;

    // Replace template variables
    const replacements = {
      '{name}': ammunitionType,
      '{material}': material,
      '{grade}': grade,
      '{grade.limit}': gradeConfig.limit || '',
      '{ammo_type}': ammoType,
      '{weapon_type}': weaponType,
      '{ammo_type.plural}': `${ammoType}s`,
      '{weapon_type.plural}': `${weaponType}s`
    };

    for (const [key, value] of Object.entries(replacements)) {
      name = name.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
      description = description.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }

    // Convert description to sentence case
    description = toSentenceCase(description);

    // Clean whitespace
    description = cleanWhitespace(description);

    // Generate slug
    const slug = toSlug(name);

    // Check for existing item with the same slug
    let itemId;
    let isExisting = false;

    if (itemSlugMap.has(slug)) {
      itemId = itemSlugMap.get(slug);
      isExisting = true;
      logWarning(`Found existing item with slug "${slug}", reusing UUID: ${itemId}`);
    } else {
      // Generate new Foundry-style ID
      itemId = generateFoundryId();
      logInfo(`Generated new ID for slug "${slug}": ${itemId}`);
    }

    // Look up folder UUID
    const folderName = ammoConfig.folder;
    let folderId = null;

    if (folderName) {
      if (!folderMap.has(folderName)) {
        // Auto-generate the folder if it doesn't exist
        logInfo(`Auto-generating folder: ${folderName}`);
        const newFolder = generateFolder(folderName);
        folderId = newFolder._id;
        folderMap.set(folderName, folderId);

        // Add the new folder to the compendium data
        compendiumData.push(newFolder);
        newFolders.add(folderName);
        logSuccess(`Generated new folder: ${folderName} (${folderId})`);
      } else {
        folderId = folderMap.get(folderName);
      }
    }

    // Create the item object
    const item = {
      name: name,
      type: "consumable",
      effects: [],
      system: {
        description: {
          gm: "",
          value: description
        },
        rules: [
          {
            key: "AdjustStrike",
            mode: "add",
            property: "materials",
            value: material.toLowerCase().replace(/\s+/g, '-'),
            definition: [
              "item:id:{item|id}"
            ]
          }
        ],
        slug: slug,
        traits: {
          otherTags: [],
          value: ammoConfig.traits || ["consumable"],
          rarity: ammoConfig.rarity || "common"
        },
        publication: {
          title: "Prisha's Precious Projectiles",
          authors: "John Carney",
          license: "OGL",
          remaster: true
        },
        level: {
          value: gradeConfig.level
        },
        quantity: ammoConfig.quantity || 1,
        baseItem: null,
        bulk: {
          value: Math.round(0.1 * 100) / 100
        },
        hp: {
          value: 0,
          max: 0
        },
        hardness: 0,
        price: {
          value: {
            gp: gradeConfig.base_price
          },
          per: ammoConfig.quantity || 1
        },
        equipped: {
          carryType: "worn"
        },
        containerId: null,
        size: "med",
        material: {
          type: null,
          grade: null
        },
        identification: {
          status: "identified",
          unidentified: {
            name: "Unusual Object",
            img: "systems/pf2e/icons/unidentified_item_icons/other-consumables.webp",
            data: {
              description: {
                value: ""
              }
            }
          },
          misidentified: {}
        },
        usage: {
          value: "held-in-one-hand"
        },
        uses: {
          value: ammoConfig.max_uses || 1,
          max: ammoConfig.max_uses || 1,
          autoDestroy: true
        },
        stackGroup: ammoConfig.stack_group || null,
        spell: null,
        category: "ammo"
      },
      img: ammoConfig.image || "systems/pf2e/icons/equipment/weapons/sling-bullets.webp",
      folder: folderId,
      ownership: {
        default: 0
      },
      flags: {},
      _stats: {
        compendiumSource: `Compendium.prishas-precious-projectiles.prishas-precious-projectiles.Item.${itemId}`,
        duplicateSource: null,
        coreVersion: "12.328",
        systemId: "pf2e",
        systemVersion: "6.0.4",
        createdTime: Date.now(),
        modifiedTime: Date.now()
      },
      _id: itemId,
      sort: 0,
      _metadata: {
        key: `!items!${itemId}`
      }
    };

    if (isExisting) {
      logSuccess(`Reused existing ammunition item: ${name}`);
    } else {
      logSuccess(`Generated new ammunition item: ${name}`);
    }
    logInfo(`Item ID: ${itemId}`);
    if (folderId) {
      logInfo(`Folder: ${folderName} (${folderId})`);
    }

    return { isExisting, itemId, name, item };

  } catch (error) {
    logError(`Failed to generate ammunition item: ${error.message}`);
    throw error;
  }
}

/**
 * Generate and merge ammunition items
 */
function generateAndMergeAmmunition(ammunitionTypes, materials, grades, outputPath) {
  logStep('Loading configuration data...');
  const { ammunitionTypes: ammoConfigs, weaponMaterials } = loadYamlData();
  const { folderMap, itemSlugMap, compendiumData } = loadCompendiumData();

  // Validate ammunition types first
  for (const ammoType of ammunitionTypes) {
    if (!ammoConfigs[ammoType]) {
      throw new Error(`Unknown ammunition type: ${ammoType}`);
    }
  }

  // Validate materials first
  for (const material of materials) {
    if (!weaponMaterials[material]) {
      throw new Error(`Unknown material: ${material}`);
    }
  }

  // Load existing output file
  const existingRecords = loadExistingOutput(outputPath);
  logInfo(`Loaded ${existingRecords.length} existing records from output file`);

  // Create maps for existing records
  const existingItemMap = new Map();
  const existingFolderMap = new Map();

  for (const record of existingRecords) {
    if (record._metadata && record._metadata.key && record._metadata.key.startsWith('!items!')) {
      if (record.system && record.system.slug) {
        existingItemMap.set(record.system.slug, record);
      }
    } else if (record._metadata && record._metadata.key && record._metadata.key.startsWith('!folders!')) {
      existingFolderMap.set(record.name, record);
    }
  }

  let totalItems = 0;
  let newItems = 0;
  let reusedItems = 0;
  let updatedItems = 0;
  const newRecords = [];
  const newFolders = new Set();

  // Generate items for each permutation
  for (const ammoType of ammunitionTypes) {
    for (const material of materials) {
      for (const grade of grades) {
        // Check if this material/grade combination exists
        if (!weaponMaterials[material].grades[grade]) {
          logWarning(`Skipping ${material} ${ammoType} (${grade}) - ${grade} grade not available for ${material}`);
          continue;
        }

        totalItems++;

        try {
          const result = generateAmmunitionItem(ammoType, material, grade, folderMap, itemSlugMap, compendiumData, newFolders);

          // Check if this item already exists in the output file
          if (existingItemMap.has(result.item.system.slug)) {
            // Update existing item
            const existingItem = existingItemMap.get(result.item.system.slug);

            // Preserve the createdTime from the existing item
            const existingCreatedTime = existingItem._stats?.createdTime;

            Object.assign(existingItem, result.item);

            // Restore the original createdTime
            if (existingCreatedTime && existingItem._stats) {
              existingItem._stats.createdTime = existingCreatedTime;
            }

            updatedItems++;
            logInfo(`Updated existing item: ${result.name} - preserved original createdTime`);
          } else {
            // Add new item
            newRecords.push(result.item);
            if (result.isExisting) {
              reusedItems++;
            } else {
              newItems++;
            }
          }

        } catch (error) {
          logError(`Failed to generate ${material} ${ammoType} (${grade}): ${error.message}`);
        }
      }
    }
  }

  // Collect auto-generated folders for output
  const newFoldersList = [];
  if (newFolders.size > 0) {
    for (const record of compendiumData) {
      if (record._metadata && record._metadata.key && record._metadata.key.startsWith('!folders!')) {
        if (newFolders.has(record.name)) {
          // Check if folder already exists in output
          if (!existingFolderMap.has(record.name)) {
            newFoldersList.push(record);
          }
        }
      }
    }
  }

  // Combine existing records with new records
  const allRecords = [...existingRecords, ...newRecords, ...newFoldersList];

  // Write all records to the output file
  writeFileSync(outputPath, JSON.stringify(allRecords, null, 2), 'utf8');

  logSuccess(`Generated ${totalItems} ammunition items total:`);
  logInfo(`  New items: ${newItems}`);
  logInfo(`  Reused items: ${reusedItems}`);
  logInfo(`  Updated items: ${updatedItems}`);
  if (newFolders.size > 0) {
    logInfo(`  New folders created: ${newFoldersList.length}`);
  }
  logInfo(`  Total records in output: ${allRecords.length}`);
  logInfo(`  Output file: ${outputPath}`);
}

// Command line interface
function main() {
  const args = process.argv.slice(2);

  if (args.length !== 4) {
    logError('Usage: node generate-ammo.mjs <ammunition-types> <materials> <grades> <output-file>');
    logInfo('');
    logInfo('Arguments can be comma-separated to generate multiple items:');
    logInfo('  node generate-ammo.mjs "Arrows,Crossbow Bolts" "Silver,Cold Iron" "High-Grade" ./output/ammunition.json');
    logInfo('  node generate-ammo.mjs "Arrows" "Silver,Adamantine" "Standard-Grade,High-Grade" ./output/ammunition.json');
    logInfo('');
    logInfo('Single item generation:');
    logInfo('  node generate-ammo.mjs "Arrows" "Silver" "High-Grade" ./output/silver-arrows.json');
    logInfo('  node generate-ammo.mjs "Crossbow Bolts" "Cold Iron" "Standard-Grade" ./output/cold-iron-bolts.json');
    logInfo('');
    logInfo('The script will merge with existing output files, preserving order and updating existing items.');
    logInfo('');
    logInfo('Available ammunition types:');
    logInfo('  Arrows, Blowgun Darts, Crossbow Bolts, Sling Bullets, etc.');
    logInfo('');
    logInfo('Available materials:');
    logInfo('  Cold Iron, Silver, Adamantine');
    logInfo('');
    logInfo('Available grades:');
    logInfo('  Low-Grade, Standard-Grade, High-Grade');
    process.exit(1);
  }

  const [ammunitionTypesArg, materialsArg, gradesArg, outputPath] = args;

  // Parse comma-separated values
  const ammunitionTypes = ammunitionTypesArg.split(',').map(s => s.trim()).filter(s => s);
  const materials = materialsArg.split(',').map(s => s.trim()).filter(s => s);
  const grades = gradesArg.split(',').map(s => s.trim()).filter(s => s);

  // Validate that we have at least one value for each
  if (ammunitionTypes.length === 0) {
    logError('No ammunition types specified');
    process.exit(1);
  }
  if (materials.length === 0) {
    logError('No materials specified');
    process.exit(1);
  }
  if (grades.length === 0) {
    logError('No grades specified');
    process.exit(1);
  }

  // Resolve relative paths
  const resolvedOutputPath = join(process.cwd(), outputPath);

  logStep('Ammunition Item Generator & Merger');
  logInfo(`Ammunition Types: ${ammunitionTypes.join(', ')}`);
  logInfo(`Materials: ${materials.join(', ')}`);
  logInfo(`Grades: ${grades.join(', ')}`);
  logInfo(`Output: ${resolvedOutputPath}`);
  log('');

  generateAndMergeAmmunition(ammunitionTypes, materials, grades, resolvedOutputPath);
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateAndMergeAmmunition };
