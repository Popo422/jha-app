# Universal Date Fix Strategy

## Best Approach: Hybrid Backend + Frontend Solution

### Backend: Standardize All API Responses
1. Create a universal date formatter for all API responses
2. Always return dates in consistent `YYYY-MM-DD` string format  
3. Apply to ALL APIs that return text date fields

### Frontend: Standardize All Date Displays
1. Create a universal `useDateDisplay` hook
2. All table columns use the same date formatter
3. All date displays use the same formatter

## Implementation Plan

### Step 1: Backend Date Utility
```typescript
// /lib/utils/api-date-formatting.ts
export function formatDateForAPI(dateValue: string | Date | null): string | null {
  if (!dateValue) return null;
  
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return null;
    
    // Always return YYYY-MM-DD format
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}
```

### Step 2: Frontend Date Hook  
```typescript
// /hooks/useDateDisplay.ts
export function useDateDisplay() {
  const formatDate = (dateValue: string | Date | null) => {
    return formatDateForPDF(dateValue); // Reuse existing utility
  };
  
  return { formatDate };
}
```

### Step 3: Universal Table Column
```typescript
// /components/ui/date-table-cell.tsx
export function DateTableCell({ value }: { value: string | Date | null }) {
  const { formatDate } = useDateDisplay();
  return <div className="text-sm">{formatDate(value)}</div>;
}
```

### Step 4: Update All APIs
- Apply `formatDateForAPI` to all responses containing date fields
- Target: submissions API, toolbox talks API, etc.

### Step 5: Update All Components  
- Replace `toLocaleDateString()` calls with `DateTableCell` or `useDateDisplay`
- Ensures consistency across all date displays

## Benefits
1. **Single source of truth** for date formatting
2. **Consistent across all features** 
3. **Easy to maintain** - change one place, fixes everywhere
4. **Type-safe** with proper TypeScript
5. **Future-proof** against timezone issues