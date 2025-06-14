"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface PPEData {
  hardHat: boolean;
  boots: boolean;
  gloves: boolean;
  safetyGlasses: boolean;
  faceMask: boolean;
}

interface PPERequirementsSectionProps {
  ppe: PPEData;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PPERequirementsSection = memo(({ ppe, onChange }: PPERequirementsSectionProps) => {
  const ppeItems = [
    { key: "hardHat", label: "Hard Hat" },
    { key: "boots", label: "Boots" },
    { key: "gloves", label: "Gloves" },
    { key: "safetyGlasses", label: "Safety Glasses" },
    { key: "faceMask", label: "Face Mask (Covid-19)" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-md md:text-xl">
          Personal Protective Equipment (PPE) Requirements
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Do you have the following list of PPE available to you for use?
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label className="font-medium">Work Uniform Requirements:</Label>
          <div className="space-y-4">
            {ppeItems.map((ppeItem) => (
              <div key={ppeItem.key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={ppeItem.key}
                  name={`ppe.${ppeItem.key}`}
                  checked={ppe[ppeItem.key as keyof PPEData]}
                  onChange={onChange}
                  className="w-4 h-4"
                />
                <Label htmlFor={ppeItem.key}>{ppeItem.label}</Label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            If PPE not selected, email will be sent to safety officer.
          </p>
        </div>
      </CardContent>
    </Card>
  );
});

PPERequirementsSection.displayName = "PPERequirementsSection";

export default PPERequirementsSection;