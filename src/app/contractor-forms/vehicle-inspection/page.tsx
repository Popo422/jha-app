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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SignatureModal from "@/components/SignatureModal";
import AttachmentPreview from "@/components/AttachmentPreview";
import ContractorSelect from "@/components/ContractorSelect";
import ProjectSelect from "@/components/ProjectSelect";
import SubcontractorSelect from "@/components/SubcontractorSelect";

interface VehicleInspectionFormData {
  // General Information
  completedBy: string;
  date: string;
  supervisor: string;
  projectName: string;
  company: string;
  
  // Equipment Info
  equipmentType: string;
  unitNumber: string;
  
  // Inspection Points
  headlights: string;
  headlightsComment: string;
  tailLights: string;
  tailLightsComment: string;
  turnIndicatorLights: string;
  turnIndicatorLightsComment: string;
  stopLights: string;
  stopLightsComment: string;
  brakes: string;
  brakesComment: string;
  emergencyParkingBrake: string;
  emergencyParkingBrakeComment: string;
  steeringMechanism: string;
  steeringMechanismComment: string;
  ballJoints: string;
  ballJointsComment: string;
  tieRods: string;
  tieRodsComment: string;
  rackPinion: string;
  rackPinionComment: string;
  bushings: string;
  bushingsComment: string;
  windshield: string;
  windshieldComment: string;
  rearWindowOtherGlass: string;
  rearWindowOtherGlassComment: string;
  windshieldWipers: string;
  windshieldWipersComment: string;
  frontSeatAdjustment: string;
  frontSeatAdjustmentComment: string;
  doors: string;
  doorsComment: string;
  horn: string;
  hornComment: string;
  speedometer: string;
  speedometerComment: string;
  bumpers: string;
  bumpersComment: string;
  mufflerExhaustSystem: string;
  mufflerExhaustSystemComment: string;
  tires: string;
  tiresComment: string;
  rearViewMirrors: string;
  rearViewMirrorsComment: string;
  safetyBelts: string;
  safetyBeltsComment: string;
  
  // Additional
  additionalPhotos: File[];
  signature: string;
}

const EQUIPMENT_TYPES = [
  'Backhoe',
  'Excavator',
  'Paver',
  'Bulldozer',
  'Forklist',
  'Snowcat',
  'Compactor',
  'Grader',
  'Yarder',
  'Crane',
  'Harvester'
];

const CONDITIONS = [
  'Good Condition',
  'Poor Condition',
  'Bad Condition',
  'N/A'
];

const INSPECTION_ITEMS = [
  { key: 'headlights', label: 'HEADLIGHTS' },
  { key: 'tailLights', label: 'TAIL LIGHTS' },
  { key: 'turnIndicatorLights', label: 'TURN INDICATOR LIGHTS' },
  { key: 'stopLights', label: 'STOP LIGHTS' },
  { key: 'brakes', label: 'BRAKES' },
  { key: 'emergencyParkingBrake', label: 'EMERGENCY/PARKING BRAKE' },
  { key: 'steeringMechanism', label: 'STEERING MECHANISM' },
  { key: 'ballJoints', label: 'Ball Joints' },
  { key: 'tieRods', label: 'Tie Rods' },
  { key: 'rackPinion', label: 'Rack & Pinion' },
  { key: 'bushings', label: 'Bushings' },
  { key: 'windshield', label: 'WINDSHIELD' },
  { key: 'rearWindowOtherGlass', label: 'REAR WINDOW & OTHER GLASS' },
  { key: 'windshieldWipers', label: 'WINDSHIELD WIPERS' },
  { key: 'frontSeatAdjustment', label: 'FRONT SEAT ADJUSTMENT' },
  { key: 'doors', label: 'DOORS (Open/Close/Lock)' },
  { key: 'horn', label: 'HORN' },
  { key: 'speedometer', label: 'SPEEDOMETER' },
  { key: 'bumpers', label: 'BUMPERS' },
  { key: 'mufflerExhaustSystem', label: 'MUFFLER AND EXHAUST SYSTEM' },
  { key: 'tires', label: 'TIRES: adequate tread depth, all lugnuts in place' },
  { key: 'rearViewMirrors', label: 'INTERIOR & EXTERIOR REAR VIEW MIRRORS' },
  { key: 'safetyBelts', label: 'SAFETY BELTS FOR DRIVER & PASSENGERS' },
];

export default function VehicleInspectionPage() {
  const { t } = useTranslation('common');
  const { contractor } = useAppSelector((state) => state.auth);
  const [submitForm, { isLoading, isSuccess, isError, error, reset }] = useSubmitFormMutation();
  const router = useRouter();
  
  const [formData, setFormData] = useState<VehicleInspectionFormData>({
    completedBy: contractor?.name || "",
    date: new Date().toISOString().split("T")[0],
    supervisor: "",
    projectName: "",
    company: contractor?.companyName || "",
    equipmentType: "",
    unitNumber: "",
    headlights: "",
    headlightsComment: "",
    tailLights: "",
    tailLightsComment: "",
    turnIndicatorLights: "",
    turnIndicatorLightsComment: "",
    stopLights: "",
    stopLightsComment: "",
    brakes: "",
    brakesComment: "",
    emergencyParkingBrake: "",
    emergencyParkingBrakeComment: "",
    steeringMechanism: "",
    steeringMechanismComment: "",
    ballJoints: "",
    ballJointsComment: "",
    tieRods: "",
    tieRodsComment: "",
    rackPinion: "",
    rackPinionComment: "",
    bushings: "",
    bushingsComment: "",
    windshield: "",
    windshieldComment: "",
    rearWindowOtherGlass: "",
    rearWindowOtherGlassComment: "",
    windshieldWipers: "",
    windshieldWipersComment: "",
    frontSeatAdjustment: "",
    frontSeatAdjustmentComment: "",
    doors: "",
    doorsComment: "",
    horn: "",
    hornComment: "",
    speedometer: "",
    speedometerComment: "",
    bumpers: "",
    bumpersComment: "",
    mufflerExhaustSystem: "",
    mufflerExhaustSystemComment: "",
    tires: "",
    tiresComment: "",
    rearViewMirrors: "",
    rearViewMirrorsComment: "",
    safetyBelts: "",
    safetyBeltsComment: "",
    additionalPhotos: [],
    signature: "",
  });

  // Reset form and redirect on successful submission
  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        router.push('/contractor-forms');
      }, 1500);
      resetFormData();
    }
  }, [isSuccess]);

  const resetFormData = useCallback(() => {
    setFormData({
      completedBy: contractor?.name || "",
      date: new Date().toISOString().split("T")[0],
      supervisor: "",
      projectName: "",
      company: contractor?.companyName || "",
      equipmentType: "",
      unitNumber: "",
      headlights: "",
      headlightsComment: "",
      tailLights: "",
      tailLightsComment: "",
      turnIndicatorLights: "",
      turnIndicatorLightsComment: "",
      stopLights: "",
      stopLightsComment: "",
      brakes: "",
      brakesComment: "",
      emergencyParkingBrake: "",
      emergencyParkingBrakeComment: "",
      steeringMechanism: "",
      steeringMechanismComment: "",
      ballJoints: "",
      ballJointsComment: "",
      tieRods: "",
      tieRodsComment: "",
      rackPinion: "",
      rackPinionComment: "",
      bushings: "",
      bushingsComment: "",
      windshield: "",
      windshieldComment: "",
      rearWindowOtherGlass: "",
      rearWindowOtherGlassComment: "",
      windshieldWipers: "",
      windshieldWipersComment: "",
      frontSeatAdjustment: "",
      frontSeatAdjustmentComment: "",
      doors: "",
      doorsComment: "",
      horn: "",
      hornComment: "",
      speedometer: "",
      speedometerComment: "",
      bumpers: "",
      bumpersComment: "",
      mufflerExhaustSystem: "",
      mufflerExhaustSystemComment: "",
      tires: "",
      tiresComment: "",
      rearViewMirrors: "",
      rearViewMirrorsComment: "",
      safetyBelts: "",
      safetyBeltsComment: "",
      additionalPhotos: [],
      signature: "",
    });
  }, [contractor]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleConditionChange = useCallback((itemKey: string, condition: string) => {
    setFormData(prev => ({ 
      ...prev, 
      [itemKey]: condition,
      // Clear comment if condition is Good or N/A
      [`${itemKey}Comment`]: (condition === 'Good Condition' || condition === 'N/A') ? '' : prev[`${itemKey}Comment` as keyof VehicleInspectionFormData] as string
    }));
  }, []);

  const handleCommentChange = useCallback((itemKey: string, comment: string) => {
    setFormData(prev => ({ ...prev, [`${itemKey}Comment`]: comment }));
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      additionalPhotos: [...prev.additionalPhotos, ...files],
    }));
  }, []);

  const handleDeletePhoto = useCallback((indexToDelete: number) => {
    setFormData(prev => ({
      ...prev,
      additionalPhotos: prev.additionalPhotos.filter((_, index) => index !== indexToDelete),
    }));
  }, []);

  const handleSignatureChange = useCallback((signature: string) => {
    setFormData(prev => ({ ...prev, signature }));
  }, []);

  const needsComment = (condition: string) => {
    return condition === 'Poor Condition' || condition === 'Bad Condition';
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    await submitForm({
      submissionType: 'vehicle-inspection',
      projectName: formData.projectName,
      date: formData.date,
      formData: formData,
      files: formData.additionalPhotos,
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
            <h1 className="text-3xl font-bold text-foreground">Vehicle Inspection</h1>
            <p className="text-muted-foreground mt-2">Daily vehicle inspection weekly report</p>
          </div>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-foreground">Inspection Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <ContractorSelect
                      label="Completed by"
                      value={formData.completedBy}
                      onChange={(value) => setFormData(prev => ({ ...prev, completedBy: value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <ContractorSelect
                      label="Supervisor"
                      value={formData.supervisor}
                      onChange={(value) => setFormData(prev => ({ ...prev, supervisor: value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <ProjectSelect
                      label="Project Name"
                      value={formData.projectName}
                      onChange={(value) => setFormData(prev => ({ ...prev, projectName: value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <SubcontractorSelect
                      label="Company"
                      value={formData.company}
                      onChange={(value) => setFormData(prev => ({ ...prev, company: value }))}
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    INSPECTION POINTS
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Daily vehicle inspections are mandatory everyday, before you get behind the wheel! 
                    Please complete the following vehicle inspection form below at the end of every week, 
                    or as soon as something becomes an issue.
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-2 font-medium">
                    Please drive safely and respectfully!
                  </p>
                </div>

                {/* Equipment Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Equipment Type *</Label>
                    <Select value={formData.equipmentType} onValueChange={(value) => setFormData(prev => ({ ...prev, equipmentType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select equipment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {EQUIPMENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitNumber">Unit #</Label>
                    <Input
                      id="unitNumber"
                      name="unitNumber"
                      value={formData.unitNumber}
                      onChange={handleInputChange}
                      placeholder="Enter unit number"
                    />
                  </div>
                </div>

                {/* Inspection Points */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md md:text-xl">Vehicle Inspection Points</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    {INSPECTION_ITEMS.map((item) => {
                      const conditionValue = formData[item.key as keyof VehicleInspectionFormData] as string;
                      const commentKey = `${item.key}Comment` as keyof VehicleInspectionFormData;
                      const commentValue = formData[commentKey] as string;
                      const showComment = needsComment(conditionValue);

                      return (
                        <div key={item.key} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0">
                          <div className="space-y-4">
                            <Label className="text-base font-semibold">{item.label} *</Label>
                            
                            <RadioGroup
                              value={conditionValue}
                              onValueChange={(value) => handleConditionChange(item.key, value)}
                              className="flex flex-wrap gap-4"
                            >
                              {CONDITIONS.map((condition) => (
                                <div key={condition} className="flex items-center space-x-2">
                                  <RadioGroupItem 
                                    value={condition} 
                                    id={`${item.key}-${condition.replace(/\s+/g, '-').toLowerCase()}`} 
                                  />
                                  <Label 
                                    htmlFor={`${item.key}-${condition.replace(/\s+/g, '-').toLowerCase()}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    {condition}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>

                            {showComment && (
                              <div className="space-y-2">
                                <Label htmlFor={`${item.key}-comment`} className="text-sm font-medium">
                                  Additional Explanation *
                                </Label>
                                <Textarea
                                  id={`${item.key}-comment`}
                                  value={commentValue}
                                  onChange={(e) => handleCommentChange(item.key, e.target.value)}
                                  placeholder="Please provide additional explanation..."
                                  className="min-h-[80px]"
                                  required
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Additional Photos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md md:text-xl">Additional Photos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <Label htmlFor="photos">Add additional photos if necessary:</Label>
                      <input
                        type="file"
                        id="photos"
                        multiple
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {formData.additionalPhotos.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">Attached Files:</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                            {formData.additionalPhotos.map((file, index) => (
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
                  <CardContent>
                    <SignatureModal
                      signature={formData.signature}
                      onSignatureChange={handleSignatureChange}
                      signerName={formData.completedBy || 'Signature'}
                      modalTitle="Vehicle Inspection Signature"
                      modalDescription="Sign below to confirm this vehicle inspection"
                      signatureLabel="Please sign below to confirm this inspection"
                      required
                    />
                  </CardContent>
                </Card>

                {isSuccess && (
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800">
                    Vehicle inspection submitted successfully!
                  </div>
                )}

                {isError && (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
                    {error && 'data' in error && typeof error.data === 'object' && error.data && 'error' in error.data 
                      ? (error.data as any).error 
                      : 'There was an error submitting your inspection. Please try again.'}
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={isLoading || !formData.signature || !formData.equipmentType || !formData.completedBy || !formData.projectName} 
                  className="w-full"
                >
                  {isLoading ? 'Submitting...' : 'Submit Vehicle Inspection'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}