# Prisha's Precious Projectiles

A compendium of arrows, crossbow bolts, and other projectiles made from precious
materials such as cold iron and silver. For use with the Pathfinder 2e system in
Foundry VTT.

## Installation

1. Open your Foundry VTT server's administration page.
2. Go to the **Add-On Modules** tab.
3. Click on **Install Module**.
4. Paste the following URL into the **Manifest URL** field:<br>
   `https://raw.githubusercontent.com/johncarney/prishas-precious-projectiles/main/module.json`
5. Click on **Install**.
6. Now you can activate the module in any of your Pathfinder 2e game worlds.

### Compendium browser

To make the items available in the Compendium Browser, you will need to manually
enable the module's compendium pack. To do this:

1. Log in to your game world as a Gamemaster.
2. Open up the Compendium Browser from a character sheet (go to the inventory
   tab and click on any of the search icons).
3. Click on **Settings**.
4. Scroll down until you find _Prisha's Precious Projectiles_ under
   **Equipment**.
5. Check the corresponding checkbox.
6. Click on **Save Changes** and close the Compendium Browser.

## Known issues

### Material types

Currently *Prisha's Precious Projectiles* only has *cold iron* and *silver* ammunition.

### Firearms

Currently this module does not have any rounds for firearms. To do it properly
would require separate items for each type of firearm, which is more work than I
want to take on right now. I did consider creating generic rounds that could be
used with any firearm, but looking at rounds in the core compendium I notice
that some are sold in boxes of 10, while others are sold in boxes of 5.

### Crossbow magazines

Currently *Prisha's Precious Projectiles* only has one type of magazine for
repeating crossbows. I think the intent is that you need a different type of
magazine for each different type of repeating crossbow, but that would make for
a lot of work for me. However, Foundry will not stop you from using Prisha's generic magazines on any type of repeating crossbow.

### Compendium browser

The compendium pack in this module is not enabled in the Compendium Browser
until you manually enable it. I am looking for a way to automate this so it is
enabled when the module is activated.

### PF2e Ranged Combat

If you roll damage for a ranged weapon using precious material ammunition from
the actions tab on a character *without* having rolled a strike, you will get a
warning from the
[*PF2e Ranged Combat*](https://foundryvtt.com/packages/pf2e-ranged-combat/) module
and the damage will not be tagged with the material's trait.

This is highly unlikely to come up in actual play as rolling damage without a
preceding strike is not common. If you do need to do this and want the
material's trait to be applied, you can turn off **Ammunition Effects** in the
*PF2e Ranged Combat* module settings.

