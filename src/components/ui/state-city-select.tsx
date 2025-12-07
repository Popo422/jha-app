"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, MapPin, X } from "lucide-react";
import usLocationsData from "@/lib/constants/us-locations.json";

interface StateCitySelectProps {
  stateValue: string;
  cityValue: string;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  stateLabel?: string;
  cityLabel?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export function StateCitySelect({
  stateValue,
  cityValue,
  onStateChange,
  onCityChange,
  stateLabel = "State",
  cityLabel = "City", 
  disabled = false,
  className = "",
  required = false
}: StateCitySelectProps) {
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [cityInputFocused, setCityInputFocused] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [stateInputFocused, setStateInputFocused] = useState(false);
  
  // Get states and cities from JSON data
  const states = Object.keys(usLocationsData);
  const availableCities = stateValue ? (usLocationsData as Record<string, string[]>)[stateValue] || [] : [];
  
  // Filter states based on current input
  const filteredStates = states.filter(state => 
    state.toLowerCase().includes(stateValue.toLowerCase())
  ).slice(0, 15); // Limit to 15 suggestions
  
  // Filter cities based on current input
  const filteredCities = availableCities.filter(city => 
    city.toLowerCase().includes(cityValue.toLowerCase())
  ).slice(0, 10); // Limit to 10 suggestions

  const handleStateSelect = (state: string) => {
    onStateChange(state);
    setShowStateDropdown(false);
    setStateInputFocused(false);
    // Clear city when state changes if it's not valid for new state
    if (cityValue && stateValue !== state) {
      const newAvailableCities = (usLocationsData as Record<string, string[]>)[state] || [];
      if (!newAvailableCities.includes(cityValue)) {
        onCityChange('');
      }
    }
  };

  const handleStateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onStateChange(value);
    // Show dropdown when typing and there are suggestions
    setShowStateDropdown(value.length > 0 && filteredStates.length > 0);
  };

  const handleStateInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setShowStateDropdown(false);
      setStateInputFocused(false);
    }
  };

  const handleStateInputFocus = () => {
    setStateInputFocused(true);
    setShowStateDropdown(true);
  };

  const handleStateInputBlur = () => {
    // Delay hiding dropdown to allow for clicks
    setTimeout(() => {
      setStateInputFocused(false);
      setShowStateDropdown(false);
    }, 150);
  };

  const handleCitySelect = (city: string) => {
    onCityChange(city);
    setShowCityDropdown(false);
    setCityInputFocused(false);
  };

  const handleCityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onCityChange(value);
    // Show dropdown when typing or when there are available cities
    if (availableCities.length > 0) {
      setShowCityDropdown(true);
    }
  };

  const handleCityInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setShowCityDropdown(false);
      setCityInputFocused(false);
      // Keep the current value - don't clear it
    }
  };

  const handleCityInputFocus = () => {
    setCityInputFocused(true);
    if (availableCities.length > 0) {
      setShowCityDropdown(true);
    }
  };

  const handleCityInputBlur = () => {
    // Delay hiding dropdown to allow for clicks
    setTimeout(() => {
      setCityInputFocused(false);
      setShowCityDropdown(false);
    }, 150);
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {/* State Input with Smart Filtering */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4" />
          {stateLabel} {required && <span className="text-red-500">*</span>}
        </Label>
        <div className="relative">
          <Input
            value={stateValue}
            onChange={handleStateInputChange}
            onFocus={handleStateInputFocus}
            onBlur={handleStateInputBlur}
            onKeyDown={handleStateInputKeyDown}
            placeholder={`Type ${stateLabel.toLowerCase()} name`}
            disabled={disabled}
            className="h-10 pr-8"
          />
          {stateValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onStateChange('');
                if (cityValue) {
                  onCityChange('');
                }
                setShowStateDropdown(false);
              }}
              className="absolute right-0 top-0 h-10 w-8 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          
          {/* Filtered state suggestions dropdown */}
          {showStateDropdown && (stateInputFocused || filteredStates.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
              {filteredStates.length > 0 ? (
                filteredStates.map((state) => (
                  <div
                    key={state}
                    onClick={() => handleStateSelect(state)}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                  >
                    {state}
                  </div>
                ))
              ) : stateInputFocused ? (
                <div className="px-4 py-2 text-sm text-gray-500">
                  Start typing to see state suggestions...
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* City Input with Smart Filtering */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4" />
          {cityLabel} {required && <span className="text-red-500">*</span>}
        </Label>
        {!stateValue ? (
          <Input
            placeholder={`Select ${stateLabel.toLowerCase()} first`}
            disabled={true}
            className="h-10"
          />
        ) : (
          <div className="relative">
            <Input
              value={cityValue}
              onChange={handleCityInputChange}
              onFocus={handleCityInputFocus}
              onBlur={handleCityInputBlur}
              onKeyDown={handleCityInputKeyDown}
              placeholder={`Type ${cityLabel.toLowerCase()} name`}
              disabled={disabled}
              className="h-10 pr-8"
            />
            {cityValue && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onCityChange('');
                  setShowCityDropdown(false);
                }}
                className="absolute right-0 top-0 h-10 w-8 p-0 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            
            {/* Filtered suggestions dropdown */}
            {showCityDropdown && cityInputFocused && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                {availableCities.length > 0 ? (
                  <>
                    {/* Show filtered cities if user is typing, or all cities if input is empty */}
                    {(cityValue ? filteredCities : availableCities.slice(0, 10)).map((city) => (
                      <div
                        key={city}
                        onClick={() => handleCitySelect(city)}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                      >
                        {city}
                      </div>
                    ))}
                    {cityValue && !availableCities.includes(cityValue) && filteredCities.length > 0 && (
                      <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
                        Or keep typing "{cityValue}" as custom city
                      </div>
                    )}
                  </>
                ) : (
                  <div className="px-4 py-2 text-sm text-gray-500">
                    No city suggestions available for {stateValue}. Enter any city name.
                  </div>
                )}
              </div>
            )}
            
            {stateValue && availableCities.length === 0 && !cityInputFocused && (
              <p className="text-xs text-gray-500 mt-1">
                No predefined cities for {stateValue}. You can type any city name.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}