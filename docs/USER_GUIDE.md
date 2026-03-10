# Playlist Data Showcase - User Guide

This guide covers the user-facing features of the Playlist Data Showcase application.

---

## Table of Contents

1. [Data Viewer Tab](#data-viewer-tab)
   - [Browsing Content](#browsing-content)
   - [Batch Image Tool](#batch-image-tool)
   - [Export/Import Custom Content](#exportimport-custom-content)

---

## Data Viewer Tab

The Data Viewer tab allows you to browse all game content including spells, skills, equipment, features, and more.

### Browsing Content

1. Select a category from the dropdown (Spells, Skills, Equipment, etc.)
2. Use the search box to filter items by name
3. Click on an item to expand and view details
4. Images are loaded from Arweave gateways with automatic fallback

### Batch Image Tool

The Batch Image Tool allows you to assign icons and images to multiple items at once. You can find it in the "Spawn Mode Controls" section of the Data Viewer tab.

#### Modes

**Predicate Mode (Apply to All)**
Applies the same icon and/or image URL to ALL items in the selected category.

Use this when you want to:
- Set a default icon for all items of a type
- Apply a consistent image style across a category

**Property Mode (Apply by Property)**
Applies different icons/images based on a property value (e.g., spell school, equipment rarity).

Use this when you want to:
- Set icons by spell school (Evocation, Necromancy, etc.)
- Set icons by equipment rarity (common, rare, legendary, etc.)
- Set icons by any other category-specific property

#### How to Use

1. **Select a Category** - Choose the content type (spells, equipment, etc.)
2. **Choose a Mode** - Predicate (all items) or Property (by property value)
3. **Enter URLs** - Provide icon and/or image URLs
   - Valid URL formats: `https://...`, `http://...`, `/path/...`, `assets/...`
4. **Preview** - Check the "Affected items" count
5. **Apply** - Click "Apply" and confirm the action

#### Persistence

**Your batch image changes are automatically saved to browser localStorage.**

- Changes persist across page reloads and browser sessions
- No manual export required for persistence
- Data is stored locally in your browser

To clear all saved batch image data, you can clear your browser's localStorage for this site.

#### Export/Import (Backup & Sharing)

While changes are automatically persisted, you can also use the Export/Import feature for:

- **Backup**: Save a copy of your customizations to a file
- **Sharing**: Share your customized content with others
- **Migration**: Move customizations between browsers or devices

**To Export:**
1. Click "Export" in the Spawn Mode Controls section
2. A JSON file will be downloaded with all custom items for the current category

**To Import:**
1. Click "Import" in the Spawn Mode Controls section
2. Select a previously exported JSON file
3. Your customizations will be restored

### Supported Categories

The Batch Image Tool works with the following categories:

| Category | Property Options |
|----------|------------------|
| Spells | school, level |
| Skills | ability |
| Equipment | rarity, type |
| Class Features | class, level |
| Racial Traits | race |
| Races | - |
| Classes | - |

### Troubleshooting

**Images not appearing after batch apply?**
- The UI should refresh automatically after applying
- Try refreshing the page if images don't appear immediately
- Check browser console for any errors

**URL validation errors?**
- Ensure URLs start with `https://`, `http://`, `/`, or `assets/`
- Arweave URLs (e.g., `ar://...`) should be converted to gateway URLs

**Changes lost after clearing browser data?**
- localStorage data is cleared when you clear browser data
- Use Export to backup your customizations before clearing data

---

## Related Documentation

- [Implementation Status](./IMPLEMENTATION_STATUS.md) - Technical implementation details
- [Engine Reference](./engine/DATA_ENGINE_REFERENCE.md) - API documentation
- [Extensibility Guide](./engine/docs/EXTENSIBILITY_GUIDE.md) - Programmatic batch image methods
