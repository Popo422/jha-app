"use client";

import { memo } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface FallProtectionData {
  usingFallProtection: boolean;
  harness: string;
  decelerator: string;
  traumaStrap: string;
  lifeLine: string;
  ropeGrab: string;
  carabiner: string;
  roofAnchor: string;
  horizontalLifeLine: string;
  crossArmStrap: string;
  selfRetractingLifeLines: string;
  auxiliaryLanyard: string;
  parapetWallClamp: string;
  guardRailSystem: string;
}

interface FallProtectionSectionProps {
  fallProtection: FallProtectionData;
  siteSpecificSafety: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FallProtectionSection = memo(({ fallProtection, siteSpecificSafety, onChange }: FallProtectionSectionProps) => {
  const { t } = useTranslation('common');
  const equipmentItems = [
    { key: "harness", label: 'Harness "Check stitching and buckles, etc"' },
    { key: "decelerator", label: 'Decelerator "Shock Pack"' },
    { key: "traumaStrap", label: "Trauma Strap" },
    { key: "lifeLine", label: 'Life Line "Rope"' },
    { key: "ropeGrab", label: "Rope Grab" },
    { key: "carabiner", label: "Carabiner(s)" },
    { key: "roofAnchor", label: "Roof Attachment Anchor" },
    { key: "horizontalLifeLine", label: "Horizontal Life Line" },
    { key: "crossArmStrap", label: "Cross Arm Strap" },
    { key: "selfRetractingLifeLines", label: "Self Retracting life lines" },
    { key: "auxiliaryLanyard", label: "Auxiliary Lanyard" },
    { key: "parapetWallClamp", label: "parapet wall clamp anchors" },
    { key: "guardRailSystem", label: "Guard Rail System" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-md md:text-xl">{t('safety.fallProtectionPreuse')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="font-medium">{t('safety.fallProtectionQuestion')}</Label>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="fallProtection-yes"
                name="fallProtection.usingFallProtection"
                value="true"
                checked={fallProtection.usingFallProtection === true}
                onChange={(e) =>
                  onChange({
                    ...e,
                    target: {
                      ...e.target,
                      name: "fallProtection.usingFallProtection",
                      type: "checkbox",
                      checked: e.target.value === "true",
                    },
                  } as any)
                }
                className="w-4 h-4"
              />
              <Label htmlFor="fallProtection-yes">{t('common.yes')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="fallProtection-no"
                name="fallProtection.usingFallProtection"
                value="false"
                checked={fallProtection.usingFallProtection === false}
                onChange={(e) =>
                  onChange({
                    ...e,
                    target: {
                      ...e.target,
                      name: "fallProtection.usingFallProtection",
                      type: "checkbox",
                      checked: e.target.value === "true",
                    },
                  } as any)
                }
                className="w-4 h-4"
              />
              <Label htmlFor="fallProtection-no">{t('common.no')}</Label>
            </div>
          </div>
        </div>

        {fallProtection.usingFallProtection && (
          <div className="space-y-4 bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border-l-4 border-orange-400">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                Equipment Inspection Required
              </span>
            </div>
            <Label className="font-medium">
              Have you inspected the following equipment and are they in good working order?
            </Label>

            {equipmentItems.map((equipment) => (
              <div key={equipment.key} className="space-y-2">
                <Label className="text-sm">{equipment.label}</Label>
                <div className="flex items-center space-x-4 ">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={`${equipment.key}-yes`}
                      name={`fallProtection.${equipment.key}`}
                      value="Yes"
                      checked={fallProtection[equipment.key as keyof FallProtectionData] === "Yes"}
                      onChange={onChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor={`${equipment.key}-yes`}>{t('common.yes')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={`${equipment.key}-no`}
                      name={`fallProtection.${equipment.key}`}
                      value="No"
                      checked={fallProtection[equipment.key as keyof FallProtectionData] === "No"}
                      onChange={onChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor={`${equipment.key}-no`}>{t('common.no')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={`${equipment.key}-notusing`}
                      name={`fallProtection.${equipment.key}`}
                      value="Not using"
                      checked={fallProtection[equipment.key as keyof FallProtectionData] === "Not using"}
                      onChange={onChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor={`${equipment.key}-notusing`}>{t('safetyItems.notUsing')}</Label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <Label className="font-medium">
            Site-specific safety items in place (Barricade/Flag Line/Caution Tape):
          </Label>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="siteSpecific-yes"
                name="siteSpecificSafety"
                value="true"
                checked={siteSpecificSafety === true}
                onChange={(e) =>
                  onChange({
                    ...e,
                    target: {
                      ...e.target,
                      name: "siteSpecificSafety",
                      type: "checkbox",
                      checked: e.target.value === "true",
                    },
                  } as any)
                }
                className="w-4 h-4"
              />
              <Label htmlFor="siteSpecific-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="siteSpecific-no"
                name="siteSpecificSafety"
                value="false"
                checked={siteSpecificSafety === false}
                onChange={(e) =>
                  onChange({
                    ...e,
                    target: {
                      ...e.target,
                      name: "siteSpecificSafety",
                      type: "checkbox",
                      checked: e.target.value === "true",
                    },
                  } as any)
                }
                className="w-4 h-4"
              />
              <Label htmlFor="siteSpecific-no">No</Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

FallProtectionSection.displayName = "FallProtectionSection";

export default FallProtectionSection;