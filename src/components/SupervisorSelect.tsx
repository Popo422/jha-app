"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useGetAdminUsersQuery } from "@/lib/features/admin-users/adminUsersApi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SupervisorSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
}

export default function SupervisorSelect({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder,
  className,
  id,
  name,
}: SupervisorSelectProps) {
  const { t } = useTranslation("common");

  // Use translations as defaults if not provided
  const finalLabel = label || t('formFields.supervisor');
  const finalPlaceholder = placeholder || "Select or search supervisor...";
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [inputValue, setInputValue] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: adminUsersData, isLoading } = useGetAdminUsersQuery({
    fetchAll: true,
    search: searchTerm || undefined,
    authType: 'contractor',
  });

  const supervisors = adminUsersData?.adminUsers || [];

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSearchTerm(newValue);
    onChange(newValue);

    // Open dropdown when typing
    if (newValue.length > 0 && !isOpen) {
      setIsOpen(true);
    }
  };

  const handleSupervisorSelect = (supervisor: any) => {
    const supervisorName = supervisor.name;
    setInputValue(supervisorName);
    onChange(supervisorName);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setSearchTerm(inputValue);
  };

  const handleDropdownToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm(inputValue);
      inputRef.current?.focus();
    }
  };

  const clearSelection = () => {
    setInputValue("");
    onChange("");
    setSearchTerm("");
    setIsOpen(false);
  };

  // Server-side search is now handled by the API, so we use all returned supervisors
  const filteredSupervisors = supervisors;

  return (
    <div className={cn("relative", className)}>
      {finalLabel && (
        <Label htmlFor={id} className="block text-sm font-medium mb-2">
          {finalLabel}
        </Label>
      )}

      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Input
            ref={inputRef}
            id={id}
            name={name}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={finalPlaceholder}
            required={required}
            disabled={disabled}
            className="pr-20"
            autoComplete="off"
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {inputValue && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDropdownToggle}
              className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
              disabled={disabled}
            >
              <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
            </Button>
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
            {isLoading ? (
              <div className="p-2 text-sm text-gray-500 dark:text-gray-400">Loading supervisors...</div>
            ) : filteredSupervisors.length > 0 ? (
              filteredSupervisors.map((supervisor) => {
                const isSelected = supervisor.name === inputValue;

                return (
                  <div
                    key={supervisor.id}
                    className={cn(
                      "p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between",
                      isSelected && "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    )}
                    onClick={() => handleSupervisorSelect(supervisor)}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{supervisor.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{supervisor.email}</div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                  </div>
                );
              })
            ) : (
              <div className="p-2 text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ? "No supervisors found" : "Search for supervisors..."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}