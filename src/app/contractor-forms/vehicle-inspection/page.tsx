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
  'backhoe',
  'excavator',
  'paver',
  'bulldozer',
  'forklist',
  'snowcat',
  'compactor',
  'grader',
  'yarder',
  'crane',
  'harvester'
];

const CONDITIONS = [
  'goodCondition',
  'poorCondition',
  'badCondition',
  'notApplicable'
];

const INSPECTION_ITEMS = [
  'headlights',
  'tailLights',
  'turnIndicatorLights',
  'stopLights',
  'brakes',
  'emergencyParkingBrake',
  'steeringMechanism',
  'ballJoints',
  'tieRods',
  'rackPinion',
  'bushings',
  'windshield',
  'rearWindowOtherGlass',
  'windshieldWipers',
  'frontSeatAdjustment',
  'doors',
  'horn',
  'speedometer',
  'bumpers',
  'mufflerExhaustSystem',
  'tires',
  'rearViewMirrors',
  'safetyBelts'
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
      [`${itemKey}Comment`]: (condition === 'goodCondition' || condition === 'notApplicable') ? '' : prev[`${itemKey}Comment` as keyof VehicleInspectionFormData] as string
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
    return condition === 'poorCondition' || condition === 'badCondition';
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
                {t('forms.backToForms')}
              </Link>
            </Button>
            <h1 className="text-3xl font-bold text-foreground">{t('vehicleInspection.title')}</h1>
            <p className="text-muted-foreground mt-2">{t('vehicleInspection.description')}</p>
          </div>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-foreground">{t('vehicleInspection.title')}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <ContractorSelect
                      label={t('forms.completedBy')}
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
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <ContractorSelect
                      label={t('formFields.supervisor')}
                      value={formData.supervisor}
                      onChange={(value) => setFormData(prev => ({ ...prev, supervisor: value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <ProjectSelect
                      label={t('forms.projectName')}
                      value={formData.projectName}
                      onChange={(value) => setFormData(prev => ({ ...prev, projectName: value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <SubcontractorSelect
                      label={t('forms.companySubcontractor')}
                      value={formData.company}
                      onChange={(value) => setFormData(prev => ({ ...prev, company: value }))}
                    />
                  </div>
                </div>

                {/* Equipment Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">{t('vehicleInspection.equipmentType')} *</Label>
                    <Select value={formData.equipmentType} onValueChange={(value) => setFormData(prev => ({ ...prev, equipmentType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('vehicleInspection.selectEquipmentType')} />
                      </SelectTrigger>
                      <SelectContent>
                        {EQUIPMENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {t(`equipmentTypes.${type}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitNumber">{t('vehicleInspection.unitNumber')}</Label>
                    <Input
                      id="unitNumber"
                      name="unitNumber"
                      value={formData.unitNumber}
                      onChange={handleInputChange}
                      placeholder={t('vehicleInspection.enterUnitNumber')}
                    />
                  </div>
                </div>

                {/* Inspection Points */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md md:text-xl">{t('vehicleInspection.vehicleInspectionPoints')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    {INSPECTION_ITEMS.map((item) => {
                      const conditionValue = formData[item as keyof VehicleInspectionFormData] as string;
                      const commentKey = `${item}Comment` as keyof VehicleInspectionFormData;
                      const commentValue = formData[commentKey] as string;
                      const showComment = needsComment(conditionValue);

                      return (
                        <div key={item} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0">
                          <div className="space-y-4">
                            <Label className="text-base font-semibold">{t(`vehicleInspectionItems.${item}`)} *</Label>
                            
                            <RadioGroup
                              value={conditionValue}
                              onValueChange={(value) => handleConditionChange(item, value)}
                              className="flex flex-wrap gap-4"
                            >
                              {CONDITIONS.map((condition) => (
                                <div key={condition} className="flex items-center space-x-2">
                                  <RadioGroupItem 
                                    value={condition} 
                                    id={`${item}-${condition}`} 
                                  />
                                  <Label 
                                    htmlFor={`${item}-${condition}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    {t(`conditions.${condition}`)}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>

                            {showComment && (
                              <div className="space-y-2">
                                <Label htmlFor={`${item}-comment`} className="text-sm font-medium">
                                  {t('vehicleInspection.additionalExplanation')} *
                                </Label>
                                <Textarea
                                  id={`${item}-comment`}
                                  value={commentValue}
                                  onChange={(e) => handleCommentChange(item, e.target.value)}
                                  placeholder={t('vehicleInspection.additionalExplanationPlaceholder')}
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
                    <CardTitle className="text-md md:text-xl">{t('vehicleInspection.additionalPhotos')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <Label htmlFor="photos">{t('vehicleInspection.addAdditionalPhotos')}</Label>
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
                          <p className="text-sm text-gray-600">{t('forms.attachments')}:</p>
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
                    <CardTitle className="text-md md:text-xl">{t('forms.digitalSignature')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SignatureModal
                      signature={formData.signature}
                      onSignatureChange={handleSignatureChange}
                      signerName={formData.completedBy || t('forms.digitalSignature')}
                      modalTitle={t('vehicleInspection.signatureTitle')}
                      modalDescription={t('vehicleInspection.signatureDescription')}
                      signatureLabel={t('vehicleInspection.signaturePrompt')}
                      required
                    />
                  </CardContent>
                </Card>

                {isSuccess && (
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800">
                    {t('vehicleInspection.submitSuccess')}
                  </div>
                )}

                {isError && (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
                    {error && 'data' in error && typeof error.data === 'object' && error.data && 'error' in error.data 
                      ? (error.data as any).error 
                      : t('vehicleInspection.submitError')}
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={isLoading || !formData.signature || !formData.equipmentType || !formData.completedBy || !formData.projectName} 
                  className="w-full"
                >
                  {isLoading ? t('vehicleInspection.submitting') : t('vehicleInspection.submitButton')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}