"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSubmitFormMutation } from "@/lib/features/submissions/submissionsApi";
import { useAppSelector } from "@/lib/hooks";
import Header from "@/components/Header";
import AppSidebar from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import HazardIdentificationSection from "@/components/forms/HazardIdentificationSection";
import PPERequirementsSection from "@/components/forms/PPERequirementsSection";
import FallProtectionSection from "@/components/forms/FallProtectionSection";
import SignatureCanvas from "react-signature-canvas";
import AttachmentPreview from "@/components/AttachmentPreview";
import ContractorSelect from "@/components/ContractorSelect";

interface JobHazardAnalysisFormData {
  completedBy: string;
  date: string;
  supervisor: string;
  jobSite: string;
  jobName: string;
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
  signature: string;
}

export default function JobHazardReportPage() {
  const { contractor } = useAppSelector((state) => state.auth);
  const [submitForm, { isLoading, isSuccess, isError, error, reset }] = useSubmitFormMutation();
  const signatureRef = useRef<SignatureCanvas>(null);
  
  const [formData, setFormData] = useState<JobHazardAnalysisFormData>({
    completedBy: contractor?.name || "",
    date: new Date().toISOString().split("T")[0],
    supervisor: "",
    jobSite: "",
    jobName: "",
    company: contractor?.companyName || "",
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
    signature: "",
  });

  const resetFormData = useCallback(() => {
    setFormData({
      completedBy: contractor?.name || "",
      date: new Date().toISOString().split("T")[0],
      supervisor: "",
      jobSite: "",
      jobName: "",
      company: contractor?.companyName || "",
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
      signature: "",
    });
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  }, [contractor]);

  // Reset form on successful submission
  useEffect(() => {
    if (isSuccess) {
      resetFormData();
    }
  }, [isSuccess, resetFormData]);

  const updateFormData = useCallback((name: string, value: string, type: string, checked: boolean) => {
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
  }, []);
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    updateFormData(name, value, type, checked);
  }, [updateFormData]);
  


  const handleCheckboxArrayChange = useCallback((section: string, field: string, value: string, checked: boolean) => {
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
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData((prev) => ({
      ...prev,
      photos: [...prev.photos, ...files],
    }));
  }, []);

  const handleDeletePhoto = useCallback((indexToDelete: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, index) => index !== indexToDelete),
    }));
  }, []);

  const handleSignatureClear = useCallback(() => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setFormData((prev) => ({
        ...prev,
        signature: "",
      }));
    }
  }, []);

  const handleSignatureEnd = useCallback(() => {
    if (signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL();
      setFormData((prev) => ({
        ...prev,
        signature: signatureData,
      }));
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    reset(); // Reset mutation state

    await submitForm({
      submissionType: 'job-hazard-analysis',
      jobSite: formData.jobSite,
      date: formData.date,
      formData: {
        completedBy: formData.completedBy,
        date: formData.date,
        supervisor: formData.supervisor,
        company: formData.company,
        jobName: formData.jobName,
        hazards: formData.hazards,
        ppe: formData.ppe,
        fallProtection: formData.fallProtection,
        siteSpecificSafety: formData.siteSpecificSafety,
        toolInspection: formData.toolInspection,
        ladderSafety: formData.ladderSafety,
        stepLadder: formData.stepLadder,
        extensionLadder: formData.extensionLadder,
        additionalSafety: formData.additionalSafety,
        signature: formData.signature,
      },
      files: formData.photos,
      authType: 'contractor',
    });
  }, [formData, submitForm, reset]);

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
                    <ContractorSelect
                      id="completedBy"
                      name="completedBy"
                      value={formData.completedBy}
                      onChange={(value) => setFormData(prev => ({ ...prev, completedBy: value }))}
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
                    <Label htmlFor="jobName">Job Name:</Label>
                    <Input id="jobName" name="jobName" value={formData.jobName} onChange={handleInputChange} placeholder="Name or title of the job" required />
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
                <HazardIdentificationSection hazards={formData.hazards} onChange={handleInputChange} />

                {/* PPE Requirements */}
                <PPERequirementsSection ppe={formData.ppe} onChange={handleInputChange} />

                {/* Fall Protection Pre-use Inspection */}
                <FallProtectionSection 
                  fallProtection={formData.fallProtection} 
                  siteSpecificSafety={formData.siteSpecificSafety}
                  onChange={handleInputChange} 
                />

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
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {formData.photos.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">Selected files:</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                            {formData.photos.map((file, index) => (
                              <AttachmentPreview
                                key={index}
                                file={file}
                                onDelete={() => handleDeletePhoto(index)}
                                showDeleteButton={true}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Signature Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md md:text-xl">Digital Signature</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Please sign below to confirm the accuracy of this analysis:</Label>
                      <div className="border border-gray-300 rounded-lg p-2 bg-white">
                        <SignatureCanvas
                          ref={signatureRef}
                          canvasProps={{
                            width: 400,
                            height: 200,
                            className: "signature-canvas w-full max-w-md mx-auto border rounded"
                          }}
                          onEnd={handleSignatureEnd}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSignatureClear}
                          className="text-sm"
                        >
                          Clear Signature
                        </Button>
                      </div>
                      {!formData.signature && (
                        <p className="text-sm text-red-600">Signature is required to submit the form.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {isSuccess && (
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800">
                    Job Hazard Analysis submitted successfully!
                  </div>
                )}

                {isError && (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
                    {error && 'data' in error && typeof error.data === 'object' && error.data && 'error' in error.data 
                      ? (error.data as any).error 
                      : 'Submission failed'}
                  </div>
                )}

                <Button type="submit" disabled={isLoading || !formData.signature} className="w-full rounded-none">
                  {isLoading ? 'Submitting...' : 'Submit'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
