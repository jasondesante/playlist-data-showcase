# ItemsTab Item Detail Expansion Plan

## Overview

Add inline expandable item details to the ItemsTab component, matching the CharacterGenTab pattern where clicking an item shows a detail panel with full item information.

## Requirements Summary

| Requirement | Decision |
|-------------|----------|
| UI Style | Inline expansion (accordion-style) |
| Content | Full details (description, stats, rarity, value, weight, properties) |
| Selection | Single selection (only one item expanded at a time) |
| Interactivity | No additional buttons (existing ones are fine) |
| Animation | Smooth transition (match CharacterGenTab) |
| Visual Style | Match CharacterGenTab style |
| Collapse Method | Click same item OR click outside |

---

## Phase 1: State Management & Types

### Task 1.1: Add Selection State

**File:** `src/components/Tabs/ItemsTab.tsx`

Add state to track the currently selected item:

```typescript
// Selection state for item detail expansion
const [selectedItem, setSelectedItem] = useState<{
  name: string;
  type: 'weapon' | 'armor' | 'item';
} | null>(null);
```

### Task 1.2: Add Click Outside Handler

Add a ref and useEffect to handle clicking outside the item details:

```typescript
const itemDetailRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (itemDetailRef.current && !itemDetailRef.current.contains(event.target as Node)) {
      setSelectedItem(null);
    }
  };

  if (selectedItem) {
    document.addEventListener('mousedown', handleClickOutside);
  }

  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [selectedItem]);
```

---

## Phase 2: Click Handlers

### Task 2.1: Create Selection Handler

Create a handler function that implements single-selection behavior (clicking the same item toggles it off):

```typescript
const handleSelectItem = (name: string, type: 'weapon' | 'armor' | 'item') => {
  // If clicking the same item, deselect it
  if (selectedItem?.name === name && selectedItem?.type === type) {
    setSelectedItem(null);
  } else {
    // Otherwise, select the new item (auto-deselects previous)
    setSelectedItem({ name, type });
  }
};
```

### Task 2.2: Add Click Handlers to Item Rows

Update each item category (weapons, armor, items) to call the selection handler:

- Add `onClick={() => handleSelectItem(item.name, 'weapon'|'armor'|'item')}`
- Add `role="button"` and `tabIndex={0}` for accessibility
- Add keyboard handler for Enter/Space
- Add visual selected state class

---

## Phase 3: Visual Selection Styling

### Task 3.1: Add Selected State CSS

**File:** `src/components/Tabs/ItemsTab.css`

Add CSS class for selected items (matching CharacterGenTab pattern):

```css
/* Selected item styling - matches CharacterGenTab pattern */
.items-equipment-item-selected {
  cursor: pointer;
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.5), 0 0 12px 2px hsl(var(--primary) / 0.3);
  border-color: hsl(var(--primary));
}
```

### Task 3.2: Apply Selected Class

Update item rows to conditionally apply the selected class:

```tsx
className={cn(
  'items-equipment-item',
  item.equipped && 'items-equipment-item-equipped',
  isAmmo && 'items-equipment-item-ammunition',
  isSelected && 'items-equipment-item-selected'  // Add this
)}
```

---

## Phase 4: Detail Row Integration

### Task 4.1: Import DetailRow Component

**File:** `src/components/Tabs/ItemsTab.tsx`

```typescript
import { DetailRow } from '../ui/DetailRow';
import type { DetailRowProperty } from '../ui/DetailRow';
```

### Task 4.2: Create Detail Row Renderer

Create a function to render the item detail row using `DetailRow`:

```typescript
const renderItemDetailRow = () => {
  if (!selectedItem) return null;

  const equipmentData = getEquipmentData(selectedItem.name);
  if (!equipmentData) return null;

  // Build properties array
  const properties: DetailRowProperty[] = [];

  // Rarity
  if (equipmentData.rarity) {
    properties.push({
      label: 'Rarity',
      value: formatRarity(equipmentData.rarity),
      valueColor: RARITY_COLORS[equipmentData.rarity]
    });
  }

  // Type
  properties.push({
    label: 'Type',
    value: equipmentData.type.charAt(0).toUpperCase() + equipmentData.type.slice(1)
  });

  // Weight
  if (equipmentData.weight !== undefined) {
    properties.push({ label: 'Weight', value: `${equipmentData.weight} lb` });
  }

  // Value (if available)
  if (equipmentData.value) {
    properties.push({ label: 'Value', value: `${equipmentData.value} gp` });
  }

  // Damage for weapons
  if (equipmentData.type === 'weapon' && equipmentData.damage) {
    properties.push({
      label: 'Damage',
      value: `${equipmentData.damage.dice} ${equipmentData.damage.damageType}`
    });
  }

  // AC for armor
  if (equipmentData.type === 'armor' && equipmentData.acBonus !== undefined) {
    properties.push({ label: 'AC Bonus', value: `+${equipmentData.acBonus}` });
  }

  // Get icon based on type
  const ItemIcon = equipmentData.type === 'weapon' ? Sword
                 : equipmentData.type === 'armor' ? Shield
                 : Package;

  // Convert properties to effects format for display
  const effects = equipmentData.properties?.map(p => ({
    type: p.type,
    target: p.target,
    value: p.value,
    description: p.description
  }));

  return (
    <div ref={itemDetailRef}>
      <DetailRow
        isVisible={true}
        title={equipmentData.name}
        icon={ItemIcon}
        description={equipmentData.description}
        properties={properties}
        effects={effects}
        tag={equipmentData.rarity ? formatRarity(equipmentData.rarity) : undefined}
        tagColor={equipmentData.rarity ? RARITY_COLORS[equipmentData.rarity] : undefined}
      />
    </div>
  );
};
```

### Task 4.3: Render Detail Row Below Item Categories

Add the detail row after each category section or at a consistent location:

```tsx
{/* Render detail row after the appropriate category */}
{selectedItem?.type === 'weapon' && renderItemDetailRow()}
{selectedItem?.type === 'armor' && renderItemDetailRow()}
{selectedItem?.type === 'item' && renderItemDetailRow()}
```

---

## Phase 5: Helper Functions

### Task 5.1: Add Rarity Formatting Function

Add the `formatRarity` function (copy from CharacterGenTab or create shared utility):

```typescript
/**
 * Format rarity for display (snake_case to Title Case)
 */
function formatRarity(rarity: string): string {
  return rarity
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
```

### Task 5.2: Ensure Rarity Color Maps Are Available

Ensure the rarity color maps are defined in ItemsTab (copy from CharacterGenTab if not present):

```typescript
const RARITY_COLORS: Record<string, string> = {
  'common': 'hsl(0 0% 50%)',
  'uncommon': 'hsl(120 60% 40%)',
  'rare': 'hsl(210 80% 50%)',
  'very_rare': 'hsl(270 60% 50%)',
  'legendary': 'hsl(30 90% 50%)'
};
```

---

## Phase 6: Accessibility

### Task 6.1: Add Keyboard Navigation

Ensure keyboard navigation works for item selection:

```tsx
onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleSelectItem(item.name, 'weapon');
  }
}}
```

### Task 6.2: Add ARIA Attributes

Add appropriate ARIA attributes for expandable items:

```tsx
aria-expanded={isSelected}
aria-controls={`item-detail-${item.name.replace(/\s+/g, '-').toLowerCase()}`}
```

---

## Implementation Order

1. **Phase 1** - State management (quick foundation)
2. **Phase 3** - Visual styling (immediate feedback)
3. **Phase 2** - Click handlers (make it work)
4. **Phase 5** - Helper functions (support code)
5. **Phase 4** - Detail row integration (main feature)
6. **Phase 6** - Accessibility (polish)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/Tabs/ItemsTab.tsx` | Add state, handlers, DetailRow integration |
| `src/components/Tabs/ItemsTab.css` | Add selected state styling |

---

## Testing Checklist

- [ ] Clicking an item expands the detail row below it
- [ ] Clicking the same item again collapses the detail row
- [ ] Clicking outside the detail row collapses it
- [ ] Only one item can be expanded at a time
- [ ] Smooth animation on expand/collapse
- [ ] Keyboard navigation works (Enter/Space to toggle)
- [ ] Visual styling matches CharacterGenTab pattern
- [ ] All item types (weapons, armor, items) work correctly
- [ ] Detail row shows: description, rarity, type, weight, value, damage/AC
- [ ] Equipped items still show equipped styling when selected
- [ ] Cursed items still show curse styling when selected
