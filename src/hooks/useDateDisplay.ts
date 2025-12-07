import { formatDateForPDF } from '@/lib/utils/date-formatting';

/**
 * Universal date display hook
 * Provides consistent date formatting across all UI components
 */
export function useDateDisplay() {
  const formatDate = (dateValue: string | Date | null | undefined): string => {
    return formatDateForPDF(dateValue) || '';
  };

  const formatDateTime = (dateValue: string | Date | null | undefined): string => {
    if (!dateValue) return '';
    
    try {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
      if (isNaN(date.getTime())) return '';
      
      return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '';
    }
  };

  return { 
    formatDate,
    formatDateTime
  };
}