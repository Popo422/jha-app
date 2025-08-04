"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'onClick'> {
  value?: string;
  onChange?: (value: string) => void;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, value, onChange, onClick, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current!);

    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
      // Prevent event from bubbling up
      e.preventDefault();
      e.stopPropagation();
      
      // Focus and trigger the date picker
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.showPicker?.();
      }
      
      // Call the original onClick if provided
      onClick?.(e);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
    };

    return (
      <div 
        className={cn(
          "relative flex h-9 w-32 cursor-pointer items-center rounded-md border border-input bg-background text-xs ring-offset-background",
          "hover:border-gray-400 focus-within:ring-1 focus-within:ring-ring focus-within:ring-offset-1",
          className
        )}
        onClick={handleContainerClick}
      >
        <input
          ref={inputRef}
          type="date"
          value={value || ''}
          onChange={handleInputChange}
          className={cn(
            "absolute inset-0 w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground px-3 pr-8",
            "cursor-pointer border-none outline-none focus:ring-0",
            // Hide the default date picker icon
            "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:w-4 [&::-webkit-calendar-picker-indicator]:h-full"
          )}
          {...props}
        />
        <Calendar className="absolute right-2 h-3 w-3 text-muted-foreground pointer-events-none" />
      </div>
    );
  }
);

DateInput.displayName = "DateInput";

export { DateInput };