"use client";

import { memo } from "react";
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('common');
  
  const ppeItems = [
    { key: "hardHat", label: t('safetyItems.hardHat') },
    { key: "boots", label: t('safetyItems.boots') },
    { key: "gloves", label: t('safetyItems.gloves') },
    { key: "safetyGlasses", label: t('safetyItems.safetyGlasses') },
    { key: "faceMask", label: t('safetyItems.faceMask') },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-md md:text-xl">
          {t('safety.ppeRequirements')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('safety.ppeDescription')}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label className="font-medium">{t('safety.workUniformRequirements')}</Label>
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
            {t('safety.ppeNotice')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
});

PPERequirementsSection.displayName = "PPERequirementsSection";

export default PPERequirementsSection;