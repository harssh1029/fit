# ✅ Week Collapsible UX - COMPLETE

## What Changed

The Plan Detail screen has been updated to show **week overview boxes** with collapsible day details.

### Before:
- Weeks showed title and description
- **All days were always visible** with full workout details
- "View full week" button (but it didn't hide/show days)

### After:
- Weeks show as **clean overview boxes** with just:
  - Week number badge
  - Week title (e.g., "Week 1: Foundation & Assessment")
  - Week description (focus and goals)
  - "View full details" button
- Days are **hidden by default**
- Clicking "View full details" **expands** to show all days and workouts
- Button text changes to "Hide details" when expanded
- Chevron icon animates (down → up)

---

## User Experience Flow

### 1. Initial View (Collapsed)
```
┌─────────────────────────────────┐
│  [1]  Week 1: Foundation        │
│                                 │
│  Establish baseline fitness...  │
│                                 │
│  [View full details ▼]          │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  [2]  Week 2: Intensity Build   │
│                                 │
│  Progressive overload and...    │
│                                 │
│  [View full details ▼]          │
└─────────────────────────────────┘
```

Clean, scannable overview of what each week is about.

### 2. Expanded View
```
┌─────────────────────────────────┐
│  [1]  Week 1: Foundation        │
│                                 │
│  Establish baseline fitness...  │
│                                 │
│  [Hide details ▲]               │
└─────────────────────────────────┘

    ┌───────────────────────────┐
    │ DAY 1                     │
    │ Full Body Strength   60m  │
    │ Barbell squats, deadlifts │
    └───────────────────────────┘
    
    ┌───────────────────────────┐
    │ DAY 2                     │
    │ HYROX Intervals      45m  │
    │ 8 rounds: 200m run + ...  │
    └───────────────────────────┘
    
    ... (all 7 days shown)
```

Full workout details visible when needed.

---

## Technical Implementation

### State Management
```typescript
// Track which weeks are expanded
const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

const toggleWeekExpanded = (weekId: string) => {
  setExpandedWeeks((prev) => {
    const next = new Set(prev);
    if (next.has(weekId)) {
      next.delete(weekId);  // Collapse
    } else {
      next.add(weekId);     // Expand
    }
    return next;
  });
};
```

### Conditional Rendering
```typescript
{plan.weeks.map((week) => {
  const isExpanded = expandedWeeks.has(week.id);
  
  return (
    <View>
      {/* Week Overview Box - Always Visible */}
      <View style={weekBoxStyle}>
        <WeekHeader />
        <WeekDescription />
        <TouchableOpacity onPress={() => toggleWeekExpanded(week.id)}>
          <Text>{isExpanded ? 'Hide details' : 'View full details'}</Text>
          <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} />
        </TouchableOpacity>
      </View>
      
      {/* Days - Only show when expanded */}
      {isExpanded && (
        <View>
          {week.days.map(day => <DayCard />)}
        </View>
      )}
    </View>
  );
})}
```

---

## Benefits

### 🎯 Improved UX
- **Scannable overview** - Users can quickly see what each week focuses on
- **Progressive disclosure** - Details only shown when needed
- **Reduced cognitive load** - Less overwhelming initial view
- **Better for mobile** - Less scrolling required

### ⚡ Performance
- Days are not rendered until expanded
- Reduces initial render time for plans with many days
- Smoother scrolling performance

### 📱 Mobile-First
- Follows mobile design best practices
- Collapsible sections for long content
- Touch-friendly buttons with clear states

---

## Visual Design

### Week Overview Box
- **Padding:** 16px for touch-friendly spacing
- **Border radius:** 18px (matches app design system)
- **Border:** Subtle border (light: #E2E8F0, dark: rgba(148, 163, 184, 0.35))
- **Background:** Card color (light/dark theme aware)

### Week Number Badge
- **Size:** 32x32px circle
- **Background:** Dark navy (light mode) / Light alt (dark mode)
- **Number:** White, bold, size 14

### Button States
- **Default:** "View full details" + chevron-down
- **Expanded:** "Hide details" + chevron-up
- **Active opacity:** 0.85 for touch feedback

### Day Cards (When Expanded)
- **Indent:** 8px padding-left for visual hierarchy
- **Same design** as before (Day number, title, duration, exercises)

---

## Files Modified

### `mobile/App.tsx`
- **Line 3823-3838:** Added `expandedWeeks` state and `toggleWeekExpanded` function
- **Line 4174-4363:** Refactored week rendering:
  - Wrapped week info in a box/card
  - Made button toggle expansion state
  - Conditionally render days only when `isExpanded`

---

## Testing

### Manual Test Steps
1. Start the mobile app
2. Navigate to **Plans** tab
3. Select **Hyrox Intense** plan
4. **Initial state:** See 3 week boxes, no days visible
5. **Tap "View full details"** on Week 1
   - ✅ Week 1 expands to show 7 days
   - ✅ Button text changes to "Hide details"
   - ✅ Chevron flips up
6. **Tap "Hide details"**
   - ✅ Days collapse/hide
   - ✅ Button reverts to "View full details"
7. **Expand multiple weeks**
   - ✅ Each week can be toggled independently

---

## Screenshots Reference

### Before
```
Week 1: Foundation
Establish baseline...

  Day 1: Full Body Strength
  Day 2: HYROX Intervals
  Day 3: Recovery Run
  ... (all days always shown)
  
[View full week ▲]  <-- Button did nothing
```

### After
```
┌─────────────────────┐
│ [1] Week 1: Found.  │
│ Establish baseline  │
│ [View full details ▼]│ <-- Collapsed by default
└─────────────────────┘

(Click to expand)

┌─────────────────────┐
│ [1] Week 1: Found.  │
│ Establish baseline  │
│ [Hide details ▲]    │ <-- Now expanded
└─────────────────────┘
  Day 1: Full Body...
  Day 2: HYROX Int...
  ... (days shown)
```

---

✅ **Implementation complete! Week details are now collapsible with clean overview boxes.**

