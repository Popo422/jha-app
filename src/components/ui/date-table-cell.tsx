import { useDateDisplay } from '@/hooks/useDateDisplay';

interface DateTableCellProps {
  value: string | Date | null | undefined;
  className?: string;
  includeTime?: boolean;
}

/**
 * Universal date table cell component
 * Ensures consistent date formatting across all data tables
 */
export function DateTableCell({ value, className = "text-sm", includeTime = false }: DateTableCellProps) {
  const { formatDate, formatDateTime } = useDateDisplay();
  
  const formattedValue = includeTime ? formatDateTime(value) : formatDate(value);
  
  return (
    <div className={className}>
      {formattedValue || '—'}
    </div>
  );
}