"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
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
import { useRouter } from "next/navigation";
import HazardIdentificationSection from "@/components/forms/HazardIdentificationSection";
import PPERequirementsSection from "@/components/forms/PPERequirementsSection";
import FallProtectionSection from "@/components/forms/FallProtectionSection";
import SignatureCanvas from "react-signature-canvas";
import AttachmentPreview from "@/components/AttachmentPreview";
import ContractorSelect from "@/components/ContractorSelect";
import ProjectSelect from "@/components/ProjectSelect";
import SubcontractorSelect from "@/components/SubcontractorSelect";
import SupervisorSelect from "@/components/SupervisorSelect";

interface JobHazardAnalysisFormData {
  completedBy: string;
  date: string;
  supervisor: string;
  projectName: string;
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
  const { t } = useTranslation('common');
  const { contractor } = useAppSelector((state) => state.auth);
  const [submitForm, { isLoading, isSuccess, isError, error, reset }] = useSubmitFormMutation();
  const router = useRouter();
  const signatureRef = useRef<SignatureCanvas>(null);
  
  const [formData, setFormData] = useState<JobHazardAnalysisFormData>({
    completedBy: contractor?.name || "",
    date: new Date().toISOString().split("T")[0],
    supervisor: "",
    projectName: "",
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
      projectName: "",
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

  // Reset form and redirect on successful submission
  useEffect(() => {
    if (isSuccess) {
      // Redirect to contractor forms after a brief delay
      setTimeout(() => {
        router.push('/contractor-forms');
      }, 1500);
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
      projectName: formData.projectName,
      date: formData.date,
      formData: {
        completedBy: formData.completedBy,
        date: formData.date,
        supervisor: formData.supervisor,
        company: formData.company,
        projectName: formData.projectName,
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
                {t('forms.backToForms')}
              </Link>
            </Button>
            <h1 className="text-3xl font-bold text-foreground">{t('forms.jobHazardAnalysis')}</h1>
          </div>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-foreground">{t('forms.reportDetails')}</CardTitle>
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
                    <Label htmlFor="date">{t('formFields.date')}</Label>
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
                    <SupervisorSelect
                      id="supervisor"
                      name="supervisor"
                      value={formData.supervisor}
                      onChange={(value) => setFormData(prev => ({ ...prev, supervisor: value }))}
                      label={t('formFields.supervisor')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <ProjectSelect
                      id="projectName"
                      name="projectName"
                      value={formData.projectName}
                      onChange={(value) => setFormData(prev => ({ ...prev, projectName: value }))}
                      label={t('formFields.projectName')}
                      placeholder={t('placeholders.projectName')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <SubcontractorSelect
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={(value) => setFormData(prev => ({ ...prev, company: value }))}
                      label={t('admin.companySubcontractor')}
                      required
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>{t('forms.instructions')}</strong>
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
                    <CardTitle className="text-md md:text-xl">{t('safety.toolInspection')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-medium">
                        {t('safetyQuestions.powerToolsGFCI')}:
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
                          <Label htmlFor="powerTools-yes">{t('adminEdit.yes')}</Label>
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
                          <Label htmlFor="powerTools-no">{t('adminEdit.no')}</Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-medium">{t('safetyQuestions.usingLadderToday')}?</Label>
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
                          <Label htmlFor="ladder-yes">{t('adminEdit.yes')}</Label>
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
                          <Label htmlFor="ladder-no">{t('adminEdit.no')}</Label>
                        </div>
                      </div>
                    </div>

                    {formData.toolInspection.usingLadder && (
                      <div className="space-y-2 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border-l-4 border-orange-400">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                          <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                            {t('safetyQuestions.ladderTypeSelection')}
                          </span>
                        </div>
                        <Label className="font-medium">{t('safetyQuestions.ladderTypeQuestion')}?</Label>
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
                          {t('safetyQuestions.ladderSafetyChecksRequired')}
                        </span>
                      </div>
                      <CardTitle className="text-md md:text-xl">{t('safety.generalLadderSafety')}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {t('safetyQuestions.completedSafetyChecks')}?
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        { key: "ladderAltered", label: t('safetyQuestions.ladderAltered') },
                        {
                          key: "weatherCompromised",
                          label: t('safetyQuestions.weatherCompromised'),
                        },
                        {
                          key: "housekeeping",
                          label: t('safetyQuestions.housekeeping'),
                        },
                        { key: "rungsClean", label: t('safetyQuestions.rungsClean') },
                        { key: "feetPositioned", label: t('safetyQuestions.feetPositioned') },
                        {
                          key: "livePowerPrecautions",
                          label: t('safetyQuestions.livePowerPrecautions'),
                        },
                        { key: "threePointContact", label: t('safetyQuestions.threePointContact') },
                        { key: "overheadObstructions", label: t('safetyQuestions.overheadObstructions') },
                        {
                          key: "stableSurface",
                          label: t('safetyQuestions.stableSurface'),
                        },
                        { key: "facingLadder", label: t('safetyQuestions.facingLadder') },
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
                              <Label htmlFor={`${safety.key}-yes`}>{t('adminEdit.yes')}</Label>
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
                              <Label htmlFor={`${safety.key}-no`}>{t('adminEdit.no')}</Label>
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
                            {t('safetyQuestions.stepLadderInspectionRequired')}
                          </span>
                        </div>
                        <CardTitle className="text-md md:text-xl">{t('safety.stepLadderInspection')}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {[
                          { key: "stepsCondition", label: t('safetyQuestions.stepsCondition') },
                          { key: "labelsReadable", label: t('safetyQuestions.labelsReadable') },
                          { key: "topCondition", label: t('safetyQuestions.topCondition') },
                          { key: "spreaderCondition", label: t('safetyQuestions.spreaderCondition') },
                          { key: "generalCondition", label: t('safetyQuestions.generalCondition') },
                          { key: "bracingCondition", label: t('safetyQuestions.bracingCondition') },
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
                                <Label htmlFor={`step-${condition.key}-yes`}>{t('adminEdit.yes')}</Label>
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
                                <Label htmlFor={`step-${condition.key}-no`}>{t('adminEdit.no')}</Label>
                              </div>
                            </div>
                          </div>
                        ))}

                        <div className="space-y-2">
                          <Label htmlFor="stepOther">{t('formFields.other')}:</Label>
                          <Textarea
                            id="stepOther"
                            name="stepLadder.other"
                            value={formData.stepLadder.other}
                            onChange={handleInputChange}
                            rows={2}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="stepDetails">{t('formFields.details')}:</Label>
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
                            {t('safetyQuestions.extensionLadderInspectionRequired')}
                          </span>
                        </div>
                        <CardTitle className="text-md md:text-xl">{t('safety.extensionLadderInspection')}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {[
                          { key: "rungsCondition", label: t('safetyQuestions.rungsCondition') },
                          { key: "railsCondition", label: t('safetyQuestions.railsCondition') },
                          { key: "labelsReadable", label: "Labels: Missing, Not readable" },
                          { key: "hardwareCondition", label: t('safetyQuestions.hardwareCondition') },
                          { key: "shoesCondition", label: t('safetyQuestions.shoesCondition') },
                          { key: "ropePulleyCondition", label: t('safetyQuestions.ropePulleyCondition') },
                          { key: "bracingCondition", label: "Bracing rivets in good condition" },
                          { key: "generalCondition", label: "General: Rust, Corrosion, Loose" },
                          { key: "extendedHeight", label: t('safetyQuestions.extendedHeight') },
                          { key: "tieOff", label: t('safetyQuestions.tieOff') },
                          { key: "positioning", label: t('safetyQuestions.positioning') },
                          { key: "reach", label: t('safetyQuestions.reach') },
                          { key: "height", label: t('safetyQuestions.height') },
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
                                <Label htmlFor={`ext-${condition.key}-yes`}>{t('adminEdit.yes')}</Label>
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
                                <Label htmlFor={`ext-${condition.key}-no`}>{t('adminEdit.no')}</Label>
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
                    <CardTitle className="text-md md:text-xl">{t('safety.additionalSafetyMeasures')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { key: "warmUpStretch", label: t('safetyQuestions.warmUpStretch') },
                      { key: "lockoutTagout", label: t('safetyQuestions.lockoutTagout') },
                      { key: "energizedWorkPermit", label: t('safetyQuestions.energizedWorkPermit') },
                      { key: "emergencyPlan", label: t('safetyQuestions.emergencyPlan') },
                      { key: "emergencyPlanReviewed", label: t('safetyQuestions.emergencyPlanReviewed') },
                      { key: "fireExtinguisher", label: t('safetyQuestions.fireExtinguisher') },
                      { key: "firstAidKit", label: t('safetyQuestions.firstAidKit') },
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
                            <Label htmlFor={`${safety.key}-yes`}>{t('adminEdit.yes')}</Label>
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
                            <Label htmlFor={`${safety.key}-no`}>{t('adminEdit.no')}</Label>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="space-y-2">
                      <Label htmlFor="additionalNotes">{t('safetyQuestions.additionalNotes')}:</Label>
                      <Textarea
                        id="additionalNotes"
                        name="additionalSafety.additionalNotes"
                        value={formData.additionalSafety.additionalNotes}
                        onChange={handleInputChange}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-4">
                      <Label htmlFor="photos">{t('safetyQuestions.addPhotos')}:</Label>
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
                          <p className="text-sm text-gray-600">{t('adminEdit.attachedFiles')}:</p>
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
                    <CardTitle className="text-md md:text-xl">{t('forms.digitalSignature')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('safetyQuestions.signaturePrompt')}:</Label>
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
                          {t('forms.clearSignature')}
                        </Button>
                      </div>
                      {!formData.signature && (
                        <p className="text-sm text-red-600">{t('safetyQuestions.signatureRequired')}.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {isSuccess && (
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800">
                    {t('forms.jobHazardAnalysis')} {t('forms.submitSuccess')}
                  </div>
                )}

                {isError && (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
                    {error && 'data' in error && typeof error.data === 'object' && error.data && 'error' in error.data 
                      ? (error.data as any).error 
                      : t('forms.submitFailed')}
                  </div>
                )}

                <Button type="submit" disabled={isLoading || !formData.signature} className="w-full rounded-none">
                  {isLoading ? t('forms.submitting') : t('common.submit')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
