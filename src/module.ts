/**
 * Prisha's Precious Projectiles - Module Initialization
 * Registers the compendium with PF2e's compendium browser
 */

console.log('Prisha\'s Precious Projectiles: Module loaded');

// Function to save compendium browser settings
function saveCompendiumBrowserSettings(): void {
  try {
    if (game.pf2e?.compendiumBrowser?.settings) {
      game.settings.set('pf2e', 'compendiumBrowserPacks', game.pf2e.compendiumBrowser.settings);
    }
  } catch (error) {
    console.error('Prisha\'s Precious Projectiles: Error saving settings:', error);
  }
}

// Function to enable our pack in settings
function enableOurPack(): boolean {
  try {
    const packName = 'prishas-precious-projectiles.prishas-precious-projectiles';

    if (game.pf2e?.compendiumBrowser?.settings?.equipment) {
      const packSettings = game.pf2e.compendiumBrowser.settings.equipment[packName];
      if (packSettings) {
        packSettings.load = true;
        saveCompendiumBrowserSettings();
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Prisha\'s Precious Projectiles: Error enabling pack:', error);
    return false;
  }
}

// Initialize when Foundry is ready
Hooks.once('ready', (): void => {
  if (game.system?.id !== 'pf2e') {
    return;
  }

  // Check if our pack exists
  const packName = 'prishas-precious-projectiles.prishas-precious-projectiles';
  const pack = game.packs.get(packName);

  if (pack && game.pf2e?.compendiumBrowser) {
    // Try to register our pack with the compendium browser
    try {
      // Initialize the compendium list
      if (typeof game.pf2e.compendiumBrowser.initCompendiumList === 'function') {
        game.pf2e.compendiumBrowser.initCompendiumList();
      }

      // Add our pack to equipment settings if not already present
      if (game.pf2e.compendiumBrowser.settings?.equipment) {
        const equipmentSettings = game.pf2e.compendiumBrowser.settings.equipment;
        if (!equipmentSettings[packName]) {
          equipmentSettings[packName] = {
            load: true,
            name: pack.metadata.label
          };
          saveCompendiumBrowserSettings();
        } else {
          // Ensure our pack is set to load: true
          const packSettings = equipmentSettings[packName];
          if (packSettings.load !== true) {
            packSettings.load = true;
            saveCompendiumBrowserSettings();
          }
        }
      }

      // Reset initialized tabs to force refresh
      if (typeof game.pf2e.compendiumBrowser.resetInitializedTabs === 'function') {
        game.pf2e.compendiumBrowser.resetInitializedTabs();
      }

    } catch (error) {
      console.error('Prisha\'s Precious Projectiles: Error during browser integration:', error);
    }
  }
});

// Enable our pack when PF2e is ready
Hooks.on('pf2e.ready', (): void => {
  setTimeout((): void => {
    enableOurPack();
  }, 1000);
});

// Enable our pack when compendium browser is ready
Hooks.on('pf2e.compendiumBrowser.ready', (): void => {
  setTimeout((): void => {
    enableOurPack();
  }, 1000);
});

// Ensure our pack is enabled when compendium directory is opened
Hooks.on('renderCompendiumDirectory', (app: any, html: any, data: any): void => {
  if (game.system.id === 'pf2e') {
    setTimeout((): void => {
      try {
        const packName = 'prishas-precious-projectiles.prishas-precious-projectiles';

        if (game.pf2e?.compendiumBrowser) {
          // Force a refresh of the compendium list
          if (typeof game.pf2e.compendiumBrowser.initCompendiumList === 'function') {
            game.pf2e.compendiumBrowser.initCompendiumList();
          }

          // Reset tabs
          if (typeof game.pf2e.compendiumBrowser.resetInitializedTabs === 'function') {
            game.pf2e.compendiumBrowser.resetInitializedTabs();
          }

          // Ensure our pack is enabled in settings
          if (game.pf2e.compendiumBrowser.settings?.equipment) {
            const equipmentSettings = game.pf2e.compendiumBrowser.settings.equipment;
            const pack = game.packs.get(packName);
            if (pack && !equipmentSettings[packName]) {
              equipmentSettings[packName] = {
                load: true,
                name: pack.metadata.label
              };
              saveCompendiumBrowserSettings();
            } else if (equipmentSettings[packName]) {
              equipmentSettings[packName].load = true;
              saveCompendiumBrowserSettings();
            }
          }
        }
      } catch (error) {
        console.error('Prisha\'s Precious Projectiles: Error during directory integration:', error);
      }
    }, 500);
  }
});
