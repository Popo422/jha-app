"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, MapPin } from "lucide-react";
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
  // Get states and cities from JSON data
  const states = Object.keys(usLocationsData);
  const availableCities = stateValue ? (usLocationsData as Record<string, string[]>)[stateValue] || [] : [];

  const handleStateSelect = (state: string) => {
    onStateChange(state);
  };

  const handleCitySelect = (city: string) => {
    onCityChange(city);
  };

  const clearState = () => {
    onStateChange('');
    // Clear city when state is cleared
    if (cityValue) {
      onCityChange('');
    }
  };

  const clearCity = () => {
    onCityChange('');
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {/* State Dropdown */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4" />
          {stateLabel} {required && <span className="text-red-500">*</span>}
        </Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              disabled={disabled}
              className="w-full justify-between h-10"
            >
              <span className="truncate">
                {stateValue || `Select ${stateLabel.toLowerCase()}`}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full max-h-60 overflow-y-auto">
            {stateValue && (
              <>
                <DropdownMenuItem onClick={clearState}>
                  <span className="text-gray-500">Clear selection</span>
                </DropdownMenuItem>
                <div className="border-b border-gray-200 my-1" />
              </>
            )}
            {states.map((state) => (
              <DropdownMenuItem 
                key={state}
                onClick={() => handleStateSelect(state)}
                className={stateValue === state ? "bg-blue-50 text-blue-700" : ""}
              >
                {state}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* City Dropdown */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4" />
          {cityLabel} {required && <span className="text-red-500">*</span>}
        </Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              disabled={disabled || !stateValue || availableCities.length === 0}
              className="w-full justify-between h-10"
            >
              <span className="truncate">
                {cityValue || 
                 (!stateValue ? `Select ${stateLabel.toLowerCase()} first` : 
                  availableCities.length === 0 ? 'No cities available' :
                  `Select ${cityLabel.toLowerCase()}`)}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full max-h-60 overflow-y-auto">
            {cityValue && (
              <>
                <DropdownMenuItem onClick={clearCity}>
                  <span className="text-gray-500">Clear selection</span>
                </DropdownMenuItem>
                <div className="border-b border-gray-200 my-1" />
              </>
            )}
            {availableCities.map((city) => (
              <DropdownMenuItem 
                key={city}
                onClick={() => handleCitySelect(city)}
                className={cityValue === city ? "bg-blue-50 text-blue-700" : ""}
              >
                {city}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {stateValue && availableCities.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">
            No major cities available for {stateValue}
          </p>
        )}
      </div>
    </div>
  );
}