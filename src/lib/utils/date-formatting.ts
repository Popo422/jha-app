// Utility functions for consistent date formatting across PDF exports

/**
 * Formats a date string or Date object to a consistent format for PDF display
 * @param dateValue - The date string, Date object, or null/undefined value
 * @param includeTime - Whether to include time in the output (default: false)
 * @returns Formatted date string or empty string if invalid
 */
export function formatDateForPDF(dateValue: string | Date | null | undefined, includeTime: boolean = false): string {
  if (!dateValue) {
    return '';
  }

  try {
    let date: Date;
    
    if (typeof dateValue === 'string') {
      // Handle various date string formats
      date = new Date(dateValue);
    } else {
      date = dateValue;
    }

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return '';
    }

    if (includeTime) {
      // Format: MM/DD/YYYY HH:MM AM/PM
      return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else {
      // Format: MM/DD/YYYY
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    }
  } catch (error) {
    console.warn('Error formatting date for PDF:', error);
    return '';
  }
}

/**
 * Formats a date specifically for datetime fields (includes time)
 * @param dateValue - The date string, Date object, or null/undefined value
 * @returns Formatted datetime string or empty string if invalid
 */
export function formatDateTimeForPDF(dateValue: string | Date | null | undefined): string {
  return formatDateForPDF(dateValue, true);
}