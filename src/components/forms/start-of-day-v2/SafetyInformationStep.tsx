"use client";

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';

interface SafetySectionWithCustom {
  selected: { [key: string]: boolean };
  customItems: string[];
}

interface StartOfDayV2FormData {
  additionalPPE: SafetySectionWithCustom;
  focus6: SafetySectionWithCustom;
  impacts: SafetySectionWithCustom;
  permits: SafetySectionWithCustom;
  equipmentInspections: SafetySectionWithCustom;
  [key: string]: any;
}

interface SafetyInformationStepProps {
  data: StartOfDayV2FormData;
  updateData: (updates: Partial<StartOfDayV2FormData>) => void;
}

interface SafetySectionProps {
  title: string;
  items: { key: string; label: string }[];
  data: SafetySectionWithCustom;
  onUpdate: (updates: SafetySectionWithCustom) => void;
}

function SafetySection({ title, items, data, onUpdate }: SafetySectionProps) {
  const [newItem, setNewItem] = useState('');

  const updateSelection = (key: string, checked: boolean) => {
    onUpdate({
      ...data,
      selected: {
        ...data.selected,
        [key]: checked
      }
    });
  };

  const addCustomItem = () => {
    if (newItem.trim()) {
      onUpdate({
        ...data,
        customItems: [...data.customItems, newItem.trim()]
      });
      setNewItem('');
    }
  };

  const removeCustomItem = (index: number) => {
    onUpdate({
      ...data,
      customItems: data.customItems.filter((_, i) => i !== index)
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomItem();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Predefined items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <div key={item.key} className="flex items-center space-x-2">
              <Checkbox
                id={`${title}-${item.key}`}
                checked={data.selected[item.key] || false}
                onCheckedChange={(checked) => 
                  updateSelection(item.key, checked === true)
                }
              />
              <Label 
                htmlFor={`${title}-${item.key}`}
                className="text-sm font-medium cursor-pointer"
              >
                {item.label}
              </Label>
            </div>
          ))}
        </div>

        {/* Custom items as checkboxes */}
        {data.customItems.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Additional Items:
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.customItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${title}-custom-${index}`}
                      checked={data.selected[`custom_${index}`] || false}
                      onCheckedChange={(checked) => 
                        updateSelection(`custom_${index}`, checked === true)
                      }
                    />
                    <Label 
                      htmlFor={`${title}-custom-${index}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {item}
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomItem(index)}
                    className="text-red-600 hover:text-red-800 ml-2"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add custom item */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Please enter any additional items here:
          </Label>
          <div className="flex gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter Item"
              className="flex-1"
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={addCustomItem}
              disabled={!newItem.trim()}
              className="flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SafetyInformationStep({ data, updateData }: SafetyInformationStepProps) {
  const { t } = useTranslation('common');

  const safetyCategories = {
    additionalPPE: {
      title: 'Additional PPE',
      items: [
        { key: 'respirator', label: 'Respirator' },
        { key: 'faceProtection', label: 'Face Protection' },
        { key: 'hearingProtection', label: 'Hearing Protection' },
      ]
    },
    focus6: {
      title: 'Focus 6',
      items: [
        { key: 'falls', label: 'Falls' },
        { key: 'electrocution', label: 'Electrocution' },
        { key: 'evacuation', label: 'Evacuation' },
        { key: 'craneLIfting', label: 'Crane / Lifting' },
        { key: 'caughtInBetween', label: 'Caught-in or Between' },
        { key: 'struckBy', label: 'Struck By' },
      ]
    },
    impacts: {
      title: 'Impacts',
      items: [
        { key: 'weather', label: 'Weather' },
        { key: 'environment', label: 'Environment' },
        { key: 'public', label: 'Public' },
        { key: 'traffic', label: 'Traffic' },
      ]
    },
    permits: {
      title: 'Permits',
      items: [
        { key: 'hotWork', label: 'Hot Work' },
        { key: 'confinedSpace', label: 'Confined Space' },
        { key: 'evacuation', label: 'Evacuation' },
        { key: 'criticalLift', label: 'Critical Lift' },
        { key: 'lockoutTagout', label: 'Lockout Tagout' },
      ]
    },
    equipmentInspections: {
      title: 'Equipment Inspections',
      items: [
        { key: 'fallProtection', label: 'Fall Protection' },
        { key: 'rigging', label: 'Rigging' },
        { key: 'scaffoldShoring', label: 'Scaffold / Shoring' },
      ]
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Safety Information
        </h2>
      </div>

      <div className="space-y-6">
        {Object.entries(safetyCategories).map(([key, category]) => (
          <SafetySection
            key={key}
            title={category.title}
            items={category.items}
            data={data[key as keyof StartOfDayV2FormData] as SafetySectionWithCustom}
            onUpdate={(updates) => updateData({ [key]: updates })}
          />
        ))}
      </div>
    </div>
  );
}