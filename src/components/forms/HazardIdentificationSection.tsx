"use client";

import { memo } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface HazardData {
  slipFallTrips: boolean;
  slipFallTripsAction: boolean;
  pinchPoint: boolean;
  pinchPointAction: boolean;
  struckBy: boolean;
  struckByAction: boolean;
  electrical: boolean;
  electricalAction: boolean;
  shockArcFlash: boolean;
  shockArcFlashAction: boolean;
  cuts: boolean;
  cutsAction: boolean;
  elevatedWork: boolean;
  elevatedWorkAction: boolean;
  hazardousChemicals: boolean;
  hazardousChemicalsAction: boolean;
  lifting: boolean;
  liftingAction: boolean;
  noise: boolean;
  noiseAction: boolean;
  other: boolean;
  otherAction: boolean;
  details: string;
}

interface HazardIdentificationSectionProps {
  hazards: HazardData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const HazardIdentificationSection = memo(({ hazards, onChange }: HazardIdentificationSectionProps) => {
  const { t } = useTranslation('common');
  
  const hazardItems = [
    { key: "slipFallTrips", label: t('safetyItems.slipFallTrips') },
    {
      key: "pinchPoint",
      label: t('safetyItems.pinchPoint'),
    },
    { key: "struckBy", label: t('safetyItems.struckByHazards') },
    { key: "electrical", label: "General Electrical Hazards" },
    { key: "shockArcFlash", label: "Shock/ Arc Flash" },
    { key: "cuts", label: "Cuts" },
    { key: "elevatedWork", label: "Elevated Work (Lifts, Scaffolds, Ladders, Roofs)" },
    {
      key: "hazardousChemicals",
      label: "Hazardous chemicals (sealants, solvents, foams, fuels,etc..)",
    },
    { key: "lifting", label: "Lifting (Material Handling, Rigging)" },
    { key: "noise", label: "Noise" },
    { key: "other", label: "Other (Explain)" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-md md:text-xl">{t('safety.workHazardIdentification')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('safety.workHazardDescription')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {hazardItems.map((hazard) => (
          <div key={hazard.key} className="space-y-4">
            <Label className="flex-1">{hazard.label}</Label>
            <div className="flex items-center space-x-3 ">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${hazard.key}-yes`}
                  name={`hazards.${hazard.key}`}
                  value="true"
                  checked={hazards[hazard.key as keyof HazardData] === true}
                  onChange={(e) =>
                    onChange({
                      ...e,
                      target: {
                        ...e.target,
                        name: `hazards.${hazard.key}`,
                        type: "checkbox",
                        checked: e.target.value === "true",
                      },
                    } as any)
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor={`${hazard.key}-yes`}>{t('common.yes')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${hazard.key}-no`}
                  name={`hazards.${hazard.key}`}
                  value="false"
                  checked={hazards[hazard.key as keyof HazardData] === false}
                  onChange={(e) =>
                    onChange({
                      ...e,
                      target: {
                        ...e.target,
                        name: `hazards.${hazard.key}`,
                        type: "checkbox",
                        checked: e.target.value === "true",
                      },
                    } as any)
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor={`${hazard.key}-no`}>{t('common.no')}</Label>
              </div>
            </div>

            {hazards[hazard.key as keyof HazardData] && (
              <div className=" space-y-2 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border-l-4 border-orange-400">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                    {t('formFields.followUpQuestion')}
                  </span>
                </div>
                <Label className="text-sm font-medium">
                  {t('safety.eliminateHazard')}
                </Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={`${hazard.key}Action-yes`}
                      name={`hazards.${hazard.key}Action`}
                      value="true"
                      checked={hazards[`${hazard.key}Action` as keyof HazardData] === true}
                      onChange={(e) =>
                        onChange({
                          ...e,
                          target: {
                            ...e.target,
                            name: `hazards.${hazard.key}Action`,
                            type: "checkbox",
                            checked: e.target.value === "true",
                          },
                        } as any)
                      }
                      className="w-4 h-4"
                    />
                    <Label htmlFor={`${hazard.key}Action-yes`}>{t('common.yes')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={`${hazard.key}Action-no`}
                      name={`hazards.${hazard.key}Action`}
                      value="false"
                      checked={hazards[`${hazard.key}Action` as keyof HazardData] === false}
                      onChange={(e) =>
                        onChange({
                          ...e,
                          target: {
                            ...e.target,
                            name: `hazards.${hazard.key}Action`,
                            type: "checkbox",
                            checked: e.target.value === "true",
                          },
                        } as any)
                      }
                      className="w-4 h-4"
                    />
                    <Label htmlFor={`${hazard.key}Action-no`}>{t('common.no')}</Label>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="space-y-2">
          <Label htmlFor="hazardDetails">{t('formFields.details')}</Label>
          <Textarea
            id="hazardDetails"
            name="hazards.details"
            value={hazards.details}
            onChange={onChange}
            placeholder="Enter information"
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
});

HazardIdentificationSection.displayName = "HazardIdentificationSection";

export default HazardIdentificationSection;