#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import jsyaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import uuid62 from 'uuid62';

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
 * Convert text to sentence case (first letter capitalized, rest lowercase)
 */
function toSentenceCase(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convert text to slug (lowercase, spaces and punctuation to hyphens)
 */
function toSlug(text) {
  if (!text) return text;
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove punctuation except hyphens
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Clean up whitespace in text (remove spaces before periods, fold multiple whitespace)
 */
function cleanWhitespace(text) {
  if (!text) return text;
  return text
    .replace(/\s+\./g, '.') // Remove spaces before periods
    .replace(/\s+/g, ' ') // Fold multiple whitespace into single space
    .trim(); // Remove leading/trailing whitespace
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

  return { folderMap, itemSlugMap };
}

/**
 * Generate ammunition item JSON
 */
function generateAmmunitionItem(ammunitionType, material, grade) {
  try {
    const { ammunitionTypes, weaponMaterials } = loadYamlData();
    const { folderMap, itemSlugMap } = loadCompendiumData();

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

    // Clean up whitespace issues
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
      // Generate new UUID and base62 encoded ID
      const uuid = uuidv4();
      itemId = uuid62.encode(uuid);
      logInfo(`Generated new UUID for slug "${slug}": ${itemId}`);
    }

    // Look up folder UUID
    const folderName = ammoConfig.folder;
    let folderId = null;

    if (folderName) {
      if (!folderMap.has(folderName)) {
        throw new Error(`Folder not found: ${folderName}`);
      }
      folderId = folderMap.get(folderName);
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
 * Generate multiple ammunition items for all permutations
 */
function generateMultipleAmmunitionItems(ammunitionTypes, materials, grades, outputPath) {
  logStep('Loading configuration data...');
  const { ammunitionTypes: ammoConfigs, weaponMaterials } = loadYamlData();

  // Validate all inputs first
  for (const ammoType of ammunitionTypes) {
    if (!ammoConfigs[ammoType]) {
      throw new Error(`Unknown ammunition type: ${ammoType}`);
    }
  }

  for (const material of materials) {
    if (!weaponMaterials[material]) {
      throw new Error(`Unknown material: ${material}`);
    }
  }

  for (const material of materials) {
    for (const grade of grades) {
      if (!weaponMaterials[material].grades[grade]) {
        throw new Error(`Unknown grade: ${grade} for material ${material}`);
      }
    }
  }

  let totalItems = 0;
  let newItems = 0;
  let reusedItems = 0;
  const items = [];

  // Generate items for each permutation
  for (const ammoType of ammunitionTypes) {
    for (const material of materials) {
      for (const grade of grades) {
        totalItems++;

        try {
          const result = generateAmmunitionItem(ammoType, material, grade);

          if (result.isExisting) {
            reusedItems++;
          } else {
            newItems++;
          }

          items.push(result.item);

        } catch (error) {
          logError(`Failed to generate ${material} ${ammoType} (${grade}): ${error.message}`);
        }
      }
    }
  }

  // Write all items to the output file as an array
  writeFileSync(outputPath, JSON.stringify(items, null, 2), 'utf8');

  logSuccess(`Generated ${totalItems} ammunition items total:`);
  logInfo(`  New items: ${newItems}`);
  logInfo(`  Reused items: ${reusedItems}`);
  logInfo(`  Output file: ${outputPath}`);
}

// Command line interface
function main() {
  const args = process.argv.slice(2);

  if (args.length !== 4) {
    logError('Usage: node build-ammo.mjs <ammunition-types> <materials> <grades> <output-file>');
    logInfo('');
    logInfo('Arguments can be comma-separated to generate multiple items:');
    logInfo('  node build-ammo.mjs "Arrows,Crossbow Bolts" "Silver,Cold Iron" "High-Grade" ./output/ammunition.json');
    logInfo('  node build-ammo.mjs "Arrows" "Silver,Adamantine" "Standard-Grade,High-Grade" ./output/ammunition.json');
    logInfo('');
    logInfo('Single item generation (still outputs as array):');
    logInfo('  node build-ammo.mjs "Arrows" "Silver" "High-Grade" ./output/silver-arrows.json');
    logInfo('  node build-ammo.mjs "Crossbow Bolts" "Cold Iron" "Standard-Grade" ./output/cold-iron-bolts.json');
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

  logStep('Ammunition Item Generator');
  logInfo(`Ammunition Types: ${ammunitionTypes.join(', ')}`);
  logInfo(`Materials: ${materials.join(', ')}`);
  logInfo(`Grades: ${grades.join(', ')}`);
  logInfo(`Output: ${resolvedOutputPath}`);
  log('');

  generateMultipleAmmunitionItems(ammunitionTypes, materials, grades, resolvedOutputPath);
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateAmmunitionItem };
