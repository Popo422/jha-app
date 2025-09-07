"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Search, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RadarPlace {
  _id: string;
  formattedAddress: string;
  geometry: {
    coordinates: [number, number]; // [longitude, latitude]
  };
}

interface LocationAutocompleteProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  id?: string;
}

export default function LocationAutocomplete({
  label,
  value,
  onChange,
  placeholder = "Enter location...",
  className,
  required = false,
  id
}: LocationAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [places, setPlaces] = useState<RadarPlace[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  // Search places using Radar API
  const searchPlaces = useCallback(async (query: string) => {
    if (!query.trim()) {
      setPlaces([]);
      return;
    }

    setIsLoadingPlaces(true);
    try {
      const response = await fetch(`/api/places/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      setPlaces(data.places || []);
    } catch (error) {
      console.error('Error searching places:', error);
      setPlaces([]);
    } finally {
      setIsLoadingPlaces(false);
    }
  }, []);

  // Search places when search query changes
  useEffect(() => {
    if (debouncedSearchQuery && isInputFocused) {
      searchPlaces(debouncedSearchQuery);
      setShowDropdown(true);
    } else {
      setPlaces([]);
      setShowDropdown(false);
    }
  }, [debouncedSearchQuery, searchPlaces, isInputFocused]);

  const handleInputChange = (inputValue: string) => {
    setSearchQuery(inputValue);
    onChange(inputValue);
    if (!inputValue.trim()) {
      setShowDropdown(false);
    }
  };

  const handlePlaceSelect = (place: RadarPlace) => {
    onChange(place.formattedAddress);
    setSearchQuery('');
    setPlaces([]);
    setShowDropdown(false);
    setIsInputFocused(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
    setSearchQuery(value);
    if (places.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Check if the click is on a dropdown item
    if (dropdownRef.current && dropdownRef.current.contains(e.relatedTarget as Node)) {
      return;
    }
    
    // Delay hiding dropdown to allow clicking on items
    setTimeout(() => {
      setIsInputFocused(false);
      setShowDropdown(false);
      setSearchQuery('');
    }, 200);
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && !inputRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsInputFocused(false);
        setShowDropdown(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      {label && (
        <Label htmlFor={id} className={required ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
          {label}
        </Label>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          id={id}
          value={isInputFocused ? searchQuery : value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className={cn("pl-10 pr-4", className)}
          autoComplete="off"
        />
        
        {isLoadingPlaces && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
      
      {showDropdown && places.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {places.map((place) => (
            <button
              key={place._id}
              onClick={() => handlePlaceSelect(place)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 text-sm border-none bg-transparent"
            >
              <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span className="truncate">{place.formattedAddress}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}