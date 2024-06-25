# Prisha's Precious Projectiles

A compendium of arrows, crossbow bolts, and other projectiles made from precious
materials such as cold iron and silver. For use with the Pathfinder 2e system in
Foundry VTT.

## Installation

1. Open your Foundry VTT server's administration page.
2. Go to the **Add-On Modules** tab.
3. Click on **Install Module**.
4. Paste the following URL into the **Manifest URL** field: `https://github.com/johncarney/prishas-precious-projectiles/releases/download/latest/module.json`
5. Click on **Install**.

Now you can activate the module in any of your Pathfinder 2e game worlds.

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

The items in this module are not showing up in the compendium browser that pops
up when you click one of the search buttons in the inventory tab of a character
sheet. To add an item to a character's inventory, search for it in the
compendium tab of the side bar and drag it on to the character sheet. If the
character is purchasing the item, you will need to manually adjust their gold.

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

