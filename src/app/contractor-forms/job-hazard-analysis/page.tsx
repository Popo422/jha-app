"use client";

import { useState } from "react";
import Header from "@/components/Header";
import AppSidebar from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, X } from "lucide-react";
import Link from "next/link";

interface JobHazardAnalysisFormData {
  completedBy: string;
  date: string;
  supervisor: string;
  jobSite: string;
  company: string;
  hazards: {
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
  };
  ppe: {
    hardHat: boolean;
    boots: boolean;
    gloves: boolean;
    safetyGlasses: boolean;
    faceMask: boolean;
  };
  fallProtection: {
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
  };
  siteSpecificSafety: boolean;
  toolInspection: {
    powerToolsGFCI: boolean;
    usingLadder: boolean;
    ladderType: string[];
  };
  ladderSafety: {
    ladderAltered: boolean;
    weatherCompromised: boolean;
    housekeeping: boolean;
    rungsClean: boolean;
    feetPositioned: boolean;
    livePowerPrecautions: boolean;
    threePointContact: boolean;
    overheadObstructions: boolean;
    stableSurface: boolean;
    facingLadder: boolean;
  };
  stepLadder: {
    stepsCondition: boolean;
    labelsReadable: boolean;
    topCondition: boolean;
    spreaderCondition: boolean;
    generalCondition: boolean;
    bracingCondition: boolean;
    other: string;
    details: string;
  };
  extensionLadder: {
    rungsCondition: boolean;
    railsCondition: boolean;
    labelsReadable: boolean;
    hardwareCondition: boolean;
    shoesCondition: boolean;
    ropePulleyCondition: boolean;
    bracingCondition: boolean;
    generalCondition: boolean;
    extendedHeight: boolean;
    tieOff: boolean;
    positioning: boolean;
    reach: boolean;
    height: boolean;
  };
  additionalSafety: {
    warmUpStretch: boolean;
    lockoutTagout: boolean;
    energizedWorkPermit: boolean;
    emergencyPlan: boolean;
    emergencyPlanReviewed: boolean;
    fireExtinguisher: boolean;
    firstAidKit: boolean;
    additionalNotes: string;
  };
  photos: File[];
}

export default function JobHazardReportPage() {
  const [formData, setFormData] = useState<JobHazardAnalysisFormData>({
    completedBy: "",
    date: new Date().toISOString().split("T")[0],
    supervisor: "",
    jobSite: "",
    company: "",
    hazards: {
      slipFallTrips: false,
      slipFallTripsAction: false,
      pinchPoint: false,
      pinchPointAction: false,
      struckBy: false,
      struckByAction: false,
      electrical: false,
      electricalAction: false,
      shockArcFlash: false,
      shockArcFlashAction: false,
      cuts: false,
      cutsAction: false,
      elevatedWork: false,
      elevatedWorkAction: false,
      hazardousChemicals: false,
      hazardousChemicalsAction: false,
      lifting: false,
      liftingAction: false,
      noise: false,
      noiseAction: false,
      other: false,
      otherAction: false,
      details: "",
    },
    ppe: {
      hardHat: false,
      boots: false,
      gloves: false,
      safetyGlasses: false,
      faceMask: false,
    },
    fallProtection: {
      usingFallProtection: false,
      harness: "",
      decelerator: "",
      traumaStrap: "",
      lifeLine: "",
      ropeGrab: "",
      carabiner: "",
      roofAnchor: "",
      horizontalLifeLine: "",
      crossArmStrap: "",
      selfRetractingLifeLines: "",
      auxiliaryLanyard: "",
      parapetWallClamp: "",
      guardRailSystem: "",
    },
    siteSpecificSafety: false,
    toolInspection: {
      powerToolsGFCI: false,
      usingLadder: false,
      ladderType: [],
    },
    ladderSafety: {
      ladderAltered: false,
      weatherCompromised: false,
      housekeeping: false,
      rungsClean: false,
      feetPositioned: false,
      livePowerPrecautions: false,
      threePointContact: false,
      overheadObstructions: false,
      stableSurface: false,
      facingLadder: false,
    },
    stepLadder: {
      stepsCondition: false,
      labelsReadable: false,
      topCondition: false,
      spreaderCondition: false,
      generalCondition: false,
      bracingCondition: false,
      other: "",
      details: "",
    },
    extensionLadder: {
      rungsCondition: false,
      railsCondition: false,
      labelsReadable: false,
      hardwareCondition: false,
      shoesCondition: false,
      ropePulleyCondition: false,
      bracingCondition: false,
      generalCondition: false,
      extendedHeight: false,
      tieOff: false,
      positioning: false,
      reach: false,
      height: false,
    },
    additionalSafety: {
      warmUpStretch: false,
      lockoutTagout: false,
      energizedWorkPermit: false,
      emergencyPlan: false,
      emergencyPlanReviewed: false,
      fireExtinguisher: false,
      firstAidKit: false,
      additionalNotes: "",
    },
    photos: [],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;

    if (name.includes(".")) {
      const [section, field] = name.split(".");
      setFormData((prev) => {
        const sectionData = prev[section as keyof JobHazardAnalysisFormData];
        return {
          ...prev,
          [section]: {
            ...(sectionData as Record<string, any>),
            [field]: type === "checkbox" ? checked : value,
          },
        };
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handleCheckboxArrayChange = (section: string, field: string, value: string, checked: boolean) => {
    setFormData((prev) => {
      const sectionData = prev[section as keyof JobHazardAnalysisFormData];
      const currentArray = (sectionData as any)[field] as string[];
      const newArray = checked ? [...currentArray, value] : currentArray.filter((item) => item !== value);

      return {
        ...prev,
        [section]: {
          ...(sectionData as Record<string, any>),
          [field]: newArray,
        },
      };
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData((prev) => ({
      ...prev,
      photos: [...prev.photos, ...files],
    }));
  };

  const handleDeletePhoto = (indexToDelete: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, index) => index !== indexToDelete),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Job Hazard Report submitted:", formData);
    // Handle form submission here
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <AppSidebar />

      <main className="p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/contractor-forms">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Forms
              </Link>
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Job Hazard Analysis</h1>
          </div>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-foreground">Report Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="completedBy">Completed by:</Label>
                    <Input
                      id="completedBy"
                      name="completedBy"
                      value={formData.completedBy}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date:</Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      className="w-fit"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supervisor">Supervisor:</Label>
                    <Input
                      id="supervisor"
                      name="supervisor"
                      className="w-full"
                      value={formData.supervisor}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobSite">Job Site:</Label>
                    <Input id="jobSite" name="jobSite" value={formData.jobSite} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company:</Label>
                    <Input id="company" name="company" value={formData.company} onChange={handleInputChange} required />
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Instructions:</strong> Please complete the safety checklist below.
                  </p>
                </div>

                {/* Work Hazard Identification */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md md:text-xl">Work Hazard Identification</CardTitle>
                    <p className="text-sm text-muted-foreground">Are the following hazards present on your Job site?</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { key: "slipFallTrips", label: "Slip/Fall/Trips" },
                      {
                        key: "pinchPoint",
                        label:
                          "Pinch point, caught between (vehicle traffic near or in work zone, active heavy machinery, the movement of large heavy equipment etc ..)",
                      },
                      { key: "struckBy", label: "Struck By Hazards" },
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
                    ].map((hazard) => (
                      <div key={hazard.key} className="space-y-4">
                        <Label className="flex-1">{hazard.label}</Label>
                        <div className="flex items-center space-x-3 ">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id={`${hazard.key}-yes`}
                              name={`hazards.${hazard.key}`}
                              value="true"
                              checked={formData.hazards[hazard.key as keyof typeof formData.hazards] === true}
                              onChange={(e) =>
                                handleInputChange({
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
                            <Label htmlFor={`${hazard.key}-yes`}>Yes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id={`${hazard.key}-no`}
                              name={`hazards.${hazard.key}`}
                              value="false"
                              checked={formData.hazards[hazard.key as keyof typeof formData.hazards] === false}
                              onChange={(e) =>
                                handleInputChange({
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
                            <Label htmlFor={`${hazard.key}-no`}>No</Label>
                          </div>
                        </div>

                        {formData.hazards[hazard.key as keyof typeof formData.hazards] && (
                          <div className=" space-y-2 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border-l-4 border-orange-400">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                              <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                                Follow-up Question
                              </span>
                            </div>
                            <Label className="text-sm font-medium">
                              Have you taken action to eliminate this safety hazard?
                            </Label>
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={`${hazard.key}Action-yes`}
                                  name={`hazards.${hazard.key}Action`}
                                  value="true"
                                  checked={
                                    formData.hazards[`${hazard.key}Action` as keyof typeof formData.hazards] === true
                                  }
                                  onChange={(e) =>
                                    handleInputChange({
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
                                <Label htmlFor={`${hazard.key}Action-yes`}>Yes</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={`${hazard.key}Action-no`}
                                  name={`hazards.${hazard.key}Action`}
                                  value="false"
                                  checked={
                                    formData.hazards[`${hazard.key}Action` as keyof typeof formData.hazards] === false
                                  }
                                  onChange={(e) =>
                                    handleInputChange({
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
                                <Label htmlFor={`${hazard.key}Action-no`}>No</Label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="space-y-2">
                      <Label htmlFor="hazardDetails">Details:</Label>
                      <Textarea
                        id="hazardDetails"
                        name="hazards.details"
                        value={formData.hazards.details}
                        onChange={handleInputChange}
                        placeholder="Enter information"
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* PPE Requirements */}
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
                        {[
                          { key: "hardHat", label: "Hard Hat" },
                          { key: "boots", label: "Boots" },
                          { key: "gloves", label: "Gloves" },
                          { key: "safetyGlasses", label: "Safety Glasses" },
                          { key: "faceMask", label: "Face Mask (Covid-19)" },
                        ].map((ppe) => (
                          <div key={ppe.key} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={ppe.key}
                              name={`ppe.${ppe.key}`}
                              checked={formData.ppe[ppe.key as keyof typeof formData.ppe]}
                              onChange={handleInputChange}
                              className="w-4 h-4"
                            />
                            <Label htmlFor={ppe.key}>{ppe.label}</Label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        If PPE not selected, email will be sent to safety officer.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Fall Protection Pre-use Inspection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md md:text-xl">Fall Protection Pre-use Inspection</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-medium">Are you using any Fall Protection equipment today?</Label>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="fallProtection-yes"
                            name="fallProtection.usingFallProtection"
                            value="true"
                            checked={formData.fallProtection.usingFallProtection === true}
                            onChange={(e) =>
                              handleInputChange({
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
                          <Label htmlFor="fallProtection-yes">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="fallProtection-no"
                            name="fallProtection.usingFallProtection"
                            value="false"
                            checked={formData.fallProtection.usingFallProtection === false}
                            onChange={(e) =>
                              handleInputChange({
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
                          <Label htmlFor="fallProtection-no">No</Label>
                        </div>
                      </div>
                    </div>

                    {formData.fallProtection.usingFallProtection && (
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

                        {[
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
                        ].map((equipment) => (
                          <div key={equipment.key} className="space-y-2">
                            <Label className="text-sm">{equipment.label}</Label>
                            <div className="flex items-center space-x-4 ">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={`${equipment.key}-yes`}
                                  name={`fallProtection.${equipment.key}`}
                                  value="Yes"
                                  checked={
                                    formData.fallProtection[equipment.key as keyof typeof formData.fallProtection] ===
                                    "Yes"
                                  }
                                  onChange={handleInputChange}
                                  className="w-4 h-4"
                                />
                                <Label htmlFor={`${equipment.key}-yes`}>Yes</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={`${equipment.key}-no`}
                                  name={`fallProtection.${equipment.key}`}
                                  value="No"
                                  checked={
                                    formData.fallProtection[equipment.key as keyof typeof formData.fallProtection] ===
                                    "No"
                                  }
                                  onChange={handleInputChange}
                                  className="w-4 h-4"
                                />
                                <Label htmlFor={`${equipment.key}-no`}>No</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={`${equipment.key}-notusing`}
                                  name={`fallProtection.${equipment.key}`}
                                  value="Not using"
                                  checked={
                                    formData.fallProtection[equipment.key as keyof typeof formData.fallProtection] ===
                                    "Not using"
                                  }
                                  onChange={handleInputChange}
                                  className="w-4 h-4"
                                />
                                <Label htmlFor={`${equipment.key}-notusing`}>Not using</Label>
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
                            checked={formData.siteSpecificSafety === true}
                            onChange={(e) =>
                              handleInputChange({
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
                            checked={formData.siteSpecificSafety === false}
                            onChange={(e) =>
                              handleInputChange({
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

                {/* Tool Inspection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md md:text-xl">Tool Inspection</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-medium">
                        Powers Tools, GFCI and extension cords in good working condition:
                      </Label>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="powerTools-yes"
                            name="toolInspection.powerToolsGFCI"
                            value="true"
                            checked={formData.toolInspection.powerToolsGFCI === true}
                            onChange={(e) =>
                              handleInputChange({
                                ...e,
                                target: {
                                  ...e.target,
                                  name: "toolInspection.powerToolsGFCI",
                                  type: "checkbox",
                                  checked: e.target.value === "true",
                                },
                              } as any)
                            }
                            className="w-4 h-4"
                          />
                          <Label htmlFor="powerTools-yes">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="powerTools-no"
                            name="toolInspection.powerToolsGFCI"
                            value="false"
                            checked={formData.toolInspection.powerToolsGFCI === false}
                            onChange={(e) =>
                              handleInputChange({
                                ...e,
                                target: {
                                  ...e.target,
                                  name: "toolInspection.powerToolsGFCI",
                                  type: "checkbox",
                                  checked: e.target.value === "true",
                                },
                              } as any)
                            }
                            className="w-4 h-4"
                          />
                          <Label htmlFor="powerTools-no">No</Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-medium">Will you be using a ladder today?</Label>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="ladder-yes"
                            name="toolInspection.usingLadder"
                            value="true"
                            checked={formData.toolInspection.usingLadder === true}
                            onChange={(e) =>
                              handleInputChange({
                                ...e,
                                target: {
                                  ...e.target,
                                  name: "toolInspection.usingLadder",
                                  type: "checkbox",
                                  checked: e.target.value === "true",
                                },
                              } as any)
                            }
                            className="w-4 h-4"
                          />
                          <Label htmlFor="ladder-yes">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="ladder-no"
                            name="toolInspection.usingLadder"
                            value="false"
                            checked={formData.toolInspection.usingLadder === false}
                            onChange={(e) =>
                              handleInputChange({
                                ...e,
                                target: {
                                  ...e.target,
                                  name: "toolInspection.usingLadder",
                                  type: "checkbox",
                                  checked: e.target.value === "true",
                                },
                              } as any)
                            }
                            className="w-4 h-4"
                          />
                          <Label htmlFor="ladder-no">No</Label>
                        </div>
                      </div>
                    </div>

                    {formData.toolInspection.usingLadder && (
                      <div className="space-y-2 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border-l-4 border-orange-400">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                          <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                            Ladder Type Selection
                          </span>
                        </div>
                        <Label className="font-medium">What type of ladder are you using?</Label>
                        <div className="space-y-4">
                          {["Step", "Extension", "Both"].map((type) => (
                            <div key={type} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`ladder-${type}`}
                                checked={formData.toolInspection.ladderType.includes(type)}
                                onChange={(e) =>
                                  handleCheckboxArrayChange("toolInspection", "ladderType", type, e.target.checked)
                                }
                                className="w-4 h-4"
                              />
                              <Label htmlFor={`ladder-${type}`}>{type}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* General Ladder Safety */}
                {formData.toolInspection.usingLadder && (
                  <Card className="border-l-4 border-orange-400 bg-orange-50/30 dark:bg-orange-900/10">
                    <CardHeader>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                        <span className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                          Ladder Safety Checks Required
                        </span>
                      </div>
                      <CardTitle className="text-md md:text-xl">General Ladder Safety</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Have you completed the following safety precaution checks?
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        { key: "ladderAltered", label: "Has the ladder been altered?" },
                        {
                          key: "weatherCompromised",
                          label: "Is the integrity of the ladder compromised by the weather?",
                        },
                        {
                          key: "housekeeping",
                          label: "Housekeeping of Ladder. (Is the top and bottom of your ladder clear of obstruction?)",
                        },
                        { key: "rungsClean", label: "Rungs and boots clean of oil, mud or ice" },
                        { key: "feetPositioned", label: "Feet are positioned in the middle of the rung" },
                        {
                          key: "livePowerPrecautions",
                          label: "Proper precautions taken when working adjacent to live power",
                        },
                        { key: "threePointContact", label: "Maintaining 3 points of contact" },
                        { key: "overheadObstructions", label: "Overhead obstructions Eliminated" },
                        {
                          key: "stableSurface",
                          label: "Are you setting your ladder up on stable and non slippery surface?",
                        },
                        { key: "facingLadder", label: "Facing ladder at all the times" },
                      ].map((safety) => (
                        <div key={safety.key} className="space-y-2">
                          <Label className="text-sm">{safety.label}</Label>
                          <div className="flex items-center space-x-4 ">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={`${safety.key}-yes`}
                                name={`ladderSafety.${safety.key}`}
                                value="true"
                                checked={
                                  formData.ladderSafety[safety.key as keyof typeof formData.ladderSafety] === true
                                }
                                onChange={(e) =>
                                  handleInputChange({
                                    ...e,
                                    target: {
                                      ...e.target,
                                      name: `ladderSafety.${safety.key}`,
                                      type: "checkbox",
                                      checked: e.target.value === "true",
                                    },
                                  } as any)
                                }
                                className="w-4 h-4"
                              />
                              <Label htmlFor={`${safety.key}-yes`}>Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={`${safety.key}-no`}
                                name={`ladderSafety.${safety.key}`}
                                value="false"
                                checked={
                                  formData.ladderSafety[safety.key as keyof typeof formData.ladderSafety] === false
                                }
                                onChange={(e) =>
                                  handleInputChange({
                                    ...e,
                                    target: {
                                      ...e.target,
                                      name: `ladderSafety.${safety.key}`,
                                      type: "checkbox",
                                      checked: e.target.value === "true",
                                    },
                                  } as any)
                                }
                                className="w-4 h-4"
                              />
                              <Label htmlFor={`${safety.key}-no`}>No</Label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Step Ladder Inspection */}
                {formData.toolInspection.usingLadder &&
                  (formData.toolInspection.ladderType.includes("Step") ||
                    formData.toolInspection.ladderType.includes("Both")) && (
                    <Card className="border-l-4 border-orange-400 bg-orange-50/30 dark:bg-orange-900/10">
                      <CardHeader>
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                          <span className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                            Step Ladder Inspection Required
                          </span>
                        </div>
                        <CardTitle className="text-md md:text-xl">Step Ladder Inspection</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {[
                          { key: "stepsCondition", label: "Steps: Loose, Cracked, bent, Missing" },
                          { key: "labelsReadable", label: "Labels: Missing or not readable" },
                          { key: "topCondition", label: "Top: Cracked, Loose, Bent, Broken" },
                          { key: "spreaderCondition", label: "Spreader: Loose, Bent, Broken" },
                          { key: "generalCondition", label: "General: Rust, Corrosion, Loose Parts" },
                          { key: "bracingCondition", label: "Bracing, Shoes and Rivets in good condition" },
                        ].map((condition) => (
                          <div key={condition.key} className="space-y-2">
                            <Label className="text-sm">{condition.label}</Label>
                            <div className="flex items-center space-x-4 ">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={`step-${condition.key}-yes`}
                                  name={`stepLadder.${condition.key}`}
                                  value="true"
                                  checked={
                                    formData.stepLadder[condition.key as keyof typeof formData.stepLadder] === true
                                  }
                                  onChange={(e) =>
                                    handleInputChange({
                                      ...e,
                                      target: {
                                        ...e.target,
                                        name: `stepLadder.${condition.key}`,
                                        type: "checkbox",
                                        checked: e.target.value === "true",
                                      },
                                    } as any)
                                  }
                                  className="w-4 h-4"
                                />
                                <Label htmlFor={`step-${condition.key}-yes`}>Yes</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={`step-${condition.key}-no`}
                                  name={`stepLadder.${condition.key}`}
                                  value="false"
                                  checked={
                                    formData.stepLadder[condition.key as keyof typeof formData.stepLadder] === false
                                  }
                                  onChange={(e) =>
                                    handleInputChange({
                                      ...e,
                                      target: {
                                        ...e.target,
                                        name: `stepLadder.${condition.key}`,
                                        type: "checkbox",
                                        checked: e.target.value === "true",
                                      },
                                    } as any)
                                  }
                                  className="w-4 h-4"
                                />
                                <Label htmlFor={`step-${condition.key}-no`}>No</Label>
                              </div>
                            </div>
                          </div>
                        ))}

                        <div className="space-y-2">
                          <Label htmlFor="stepOther">Other:</Label>
                          <Textarea
                            id="stepOther"
                            name="stepLadder.other"
                            value={formData.stepLadder.other}
                            onChange={handleInputChange}
                            rows={2}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="stepDetails">Details:</Label>
                          <Textarea
                            id="stepDetails"
                            name="stepLadder.details"
                            value={formData.stepLadder.details}
                            onChange={handleInputChange}
                            rows={3}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* Extension Ladder Inspection */}
                {formData.toolInspection.usingLadder &&
                  (formData.toolInspection.ladderType.includes("Extension") ||
                    formData.toolInspection.ladderType.includes("Both")) && (
                    <Card className="border-l-4 border-orange-400 bg-orange-50/30 dark:bg-orange-900/10">
                      <CardHeader>
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                          <span className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                            Extension Ladder Inspection Required
                          </span>
                        </div>
                        <CardTitle className="text-md md:text-xl">Extension Ladder Inspection</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {[
                          { key: "rungsCondition", label: "Rungs: Loose, Cracked, Bent, Missing" },
                          { key: "railsCondition", label: "Rails: Cracked, Bent, Split, Frayed" },
                          { key: "labelsReadable", label: "Labels: Missing, Not readable" },
                          { key: "hardwareCondition", label: "Hardware: Missing, Loose, Broken" },
                          { key: "shoesCondition", label: "Shoes: Worn, Broken, Missing" },
                          { key: "ropePulleyCondition", label: "Rope/Pulley: Loose, Bent, Broken" },
                          { key: "bracingCondition", label: "Bracing rivets in good condition" },
                          { key: "generalCondition", label: "General: Rust, Corrosion, Loose" },
                          { key: "extendedHeight", label: "Extended: 3' above landing" },
                          { key: "tieOff", label: "Tie Off: Ladder is tied off to prevent tipping" },
                          { key: "positioning", label: "Positioning: 4:1 Ratio maintained" },
                          { key: "reach", label: "Reach: Stay within the frame of the ladder" },
                          { key: "height", label: "Height: Provides adequate height/access" },
                        ].map((condition) => (
                          <div key={condition.key} className="space-y-2">
                            <Label className="text-sm">{condition.label}</Label>
                            <div className="flex items-center space-x-4 ">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={`ext-${condition.key}-yes`}
                                  name={`extensionLadder.${condition.key}`}
                                  value="true"
                                  checked={
                                    formData.extensionLadder[condition.key as keyof typeof formData.extensionLadder] ===
                                    true
                                  }
                                  onChange={(e) =>
                                    handleInputChange({
                                      ...e,
                                      target: {
                                        ...e.target,
                                        name: `extensionLadder.${condition.key}`,
                                        type: "checkbox",
                                        checked: e.target.value === "true",
                                      },
                                    } as any)
                                  }
                                  className="w-4 h-4"
                                />
                                <Label htmlFor={`ext-${condition.key}-yes`}>Yes</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={`ext-${condition.key}-no`}
                                  name={`extensionLadder.${condition.key}`}
                                  value="false"
                                  checked={
                                    formData.extensionLadder[condition.key as keyof typeof formData.extensionLadder] ===
                                    false
                                  }
                                  onChange={(e) =>
                                    handleInputChange({
                                      ...e,
                                      target: {
                                        ...e.target,
                                        name: `extensionLadder.${condition.key}`,
                                        type: "checkbox",
                                        checked: e.target.value === "true",
                                      },
                                    } as any)
                                  }
                                  className="w-4 h-4"
                                />
                                <Label htmlFor={`ext-${condition.key}-no`}>No</Label>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                {/* Additional Safety Measures */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md md:text-xl">Additional Safety Measures</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { key: "warmUpStretch", label: "Did you warm up and stretch?" },
                      { key: "lockoutTagout", label: "Lockout Tagout necessary:" },
                      { key: "energizedWorkPermit", label: "Energized Work Permit necessary:" },
                      { key: "emergencyPlan", label: "Emergency Plan/Rescue Plan/Nearest Urgent Care Located" },
                      { key: "emergencyPlanReviewed", label: "Emergency Plan reviewed:" },
                      { key: "fireExtinguisher", label: "Nearest fire extinguisher located:" },
                      { key: "firstAidKit", label: "First aid kit" },
                    ].map((safety) => (
                      <div key={safety.key} className="space-y-2">
                        <Label className="text-sm">{safety.label}</Label>
                        <div className="flex items-center space-x-4 ">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id={`${safety.key}-yes`}
                              name={`additionalSafety.${safety.key}`}
                              value="true"
                              checked={
                                formData.additionalSafety[safety.key as keyof typeof formData.additionalSafety] === true
                              }
                              onChange={(e) =>
                                handleInputChange({
                                  ...e,
                                  target: {
                                    ...e.target,
                                    name: `additionalSafety.${safety.key}`,
                                    type: "checkbox",
                                    checked: e.target.value === "true",
                                  },
                                } as any)
                              }
                              className="w-4 h-4"
                            />
                            <Label htmlFor={`${safety.key}-yes`}>Yes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id={`${safety.key}-no`}
                              name={`additionalSafety.${safety.key}`}
                              value="false"
                              checked={
                                formData.additionalSafety[safety.key as keyof typeof formData.additionalSafety] ===
                                false
                              }
                              onChange={(e) =>
                                handleInputChange({
                                  ...e,
                                  target: {
                                    ...e.target,
                                    name: `additionalSafety.${safety.key}`,
                                    type: "checkbox",
                                    checked: e.target.value === "true",
                                  },
                                } as any)
                              }
                              className="w-4 h-4"
                            />
                            <Label htmlFor={`${safety.key}-no`}>No</Label>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="space-y-2">
                      <Label htmlFor="additionalNotes">Additional Notes:</Label>
                      <Textarea
                        id="additionalNotes"
                        name="additionalSafety.additionalNotes"
                        value={formData.additionalSafety.additionalNotes}
                        onChange={handleInputChange}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-4">
                      <Label htmlFor="photos">Add additional photos if necessary:</Label>
                      <input
                        type="file"
                        id="photos"
                        multiple
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {formData.photos.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">Selected files:</p>
                          <div className="space-y-2">
                            {formData.photos.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded"
                              >
                                <span className="text-xs text-gray-500 dark:text-gray-400">{file.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeletePhoto(index)}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Button type="submit" className="w-full rounded-none">
                  Submit
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
