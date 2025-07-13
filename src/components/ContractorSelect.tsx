'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useGetContractorsQuery } from '@/lib/features/contractors/contractorsApi'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ChevronDown, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContractorSelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
  id?: string
  name?: string
}

export default function ContractorSelect({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder,
  className,
  id,
  name
}: ContractorSelectProps) {
  const { t } = useTranslation('common')
  
  // Use translations as defaults if not provided
  const finalLabel = label || t('formFields.completedBy')
  const finalPlaceholder = placeholder || t('placeholders.selectContractor')
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [inputValue, setInputValue] = useState(value)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: contractorsData, isLoading } = useGetContractorsQuery({
    search: searchTerm,
    limit: 100
  })

  const contractors = contractorsData?.contractors || []

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setSearchTerm(newValue)
    onChange(newValue)
    
    // Open dropdown when typing
    if (newValue.length > 0 && !isOpen) {
      setIsOpen(true)
    }
  }

  const handleContractorSelect = (contractor: any) => {
    const fullName = `${contractor.firstName} ${contractor.lastName}`
    setInputValue(fullName)
    onChange(fullName)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleInputFocus = () => {
    setIsOpen(true)
    setSearchTerm(inputValue)
  }

  const handleDropdownToggle = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setSearchTerm(inputValue)
      inputRef.current?.focus()
    }
  }

  const clearSelection = () => {
    setInputValue('')
    onChange('')
    setSearchTerm('')
    setIsOpen(false)
  }

  // Filter contractors based on search term
  const filteredContractors = contractors.filter(contractor => {
    const fullName = `${contractor.firstName} ${contractor.lastName}`.toLowerCase()
    const email = contractor.email.toLowerCase()
    const search = searchTerm.toLowerCase()
    
    return fullName.includes(search) || email.includes(search)
  })

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
            autoComplete='off'
          />
          
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {inputValue && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-6 w-6 p-0 hover:bg-gray-100"
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
              className="h-6 w-6 p-0 hover:bg-gray-100"
              disabled={disabled}
            >
              <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
            </Button>
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
            {isLoading ? (
              <div className="p-2 text-sm text-gray-500">{t('status.loadingContractors')}</div>
            ) : filteredContractors.length > 0 ? (
              filteredContractors.map((contractor) => {
                const fullName = `${contractor.firstName} ${contractor.lastName}`
                const isSelected = fullName === inputValue
                
                return (
                  <div
                    key={contractor.id}
                    className={cn(
                      "p-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between",
                      isSelected && "bg-blue-50 text-blue-600"
                    )}
                    onClick={() => handleContractorSelect(contractor)}
                  >
                    <div>
                      <div className="font-medium">{fullName}</div>
                      <div className="text-sm text-gray-500">{contractor.email}</div>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                )
              })
            ) : (
              <div className="p-2 text-sm text-gray-500">
                {searchTerm ? t('status.noContractorsFound') : t('placeholders.searchContractors')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}