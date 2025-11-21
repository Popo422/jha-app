/**
 * Universal date formatting utility for API responses
 * Ensures all date fields are returned in consistent YYYY-MM-DD format
 */

export function formatDateForAPI(dateValue: string | Date | null | undefined): string | null {
  if (!dateValue) return null;
  
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    // Check if the date is valid
    if (isNaN(date.getTime())) return null;
    
    // Always return YYYY-MM-DD format (avoids timezone issues)
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.warn('Error formatting date for API:', error);
    return null;
  }
}

/**
 * Formats an object's date fields for API response
 * Automatically handles common date field names
 */
export function formatObjectDatesForAPI<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj };
  
  // Common date field names to auto-format
  const dateFields = ['date', 'dateRead', 'approvedAt', 'createdAt', 'updatedAt'];
  
  dateFields.forEach(field => {
    if (result[field]) {
      result[field] = formatDateForAPI(result[field]);
    }
  });
  
  return result;
}