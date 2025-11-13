"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useGetSubmissionQuery, useUpdateSubmissionMutation } from '@/lib/features/submissions/submissionsApi';
import { useToast } from '@/components/ui/toast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
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
  uploadedFiles?: { filename: string; url: string }[];
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

export default function AdminEditVehicleInspectionPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const submissionId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const readOnly = searchParams.get('view') === 'true';
  const { showToast } = useToast();
  
  const { data: submission, isLoading: isLoadingSubmission } = useGetSubmissionQuery(submissionId);
  const [updateSubmission, { isLoading: isUpdating }] = useUpdateSubmissionMutation();
  
  const [formData, setFormData] = useState<VehicleInspectionFormData>({
    completedBy: "",
    date: new Date().toISOString().split("T")[0],
    supervisor: "",
    projectName: "",
    company: "",
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
    uploadedFiles: [],
    signature: "",
  });

  // Initialize form data when submission loads
  useEffect(() => {
    if (submission?.formData) {
      setFormData(prev => ({
        ...prev,
        ...submission.formData,
        additionalPhotos: [], // New files to be uploaded
        uploadedFiles: submission.formData.uploadedFiles || [], // Existing files from database
      }));
    }
  }, [submission]);

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

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await updateSubmission({
        id: submissionId,
        formData: {
          ...formData,
          updatedAt: new Date().toISOString(),
        }
      }).unwrap();
      
      if (result.success) {
        showToast('Vehicle inspection updated successfully!', 'success');
        setTimeout(() => {
          router.push('/admin/safety-forms');
        }, 2000);
      } else {
        throw new Error(result.error || 'Update failed');
      }
      
    } catch (error: any) {
      console.error('Error updating vehicle inspection:', error);
      showToast(error?.data?.error || error?.message || 'There was an error updating the inspection. Please try again.', 'error');
    }
  }, [formData, updateSubmission, submissionId, showToast, router]);

  if (isLoadingSubmission) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main className="p-4 sm:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading vehicle inspection...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main className="p-4 sm:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400">Vehicle inspection not found.</p>
              <Button asChild className="mt-4">
                <Link href="/admin/safety-forms">Back to Safety Forms</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 overflow-x-hidden">
      <div className="max-w-4xl mx-auto space-y-6 overflow-x-hidden">
            <div className="mb-6">
              <Button variant="ghost" asChild className="mb-4">
                <Link href="/admin/safety-forms">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Safety Forms
                </Link>
              </Button>
              <h1 className="text-3xl font-bold text-foreground">{readOnly ? 'View Vehicle Inspection' : 'Edit Vehicle Inspection'}</h1>
              <p className="text-muted-foreground mt-2">
                Submitted by {submission.completedBy} on {new Date(submission.createdAt).toLocaleDateString()}
              </p>
            </div>

            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 w-full overflow-hidden">
              <CardHeader>
                <CardTitle className="text-foreground">Inspection Details</CardTitle>
              </CardHeader>
              <CardContent className="p-4 w-full overflow-x-hidden">
                <form onSubmit={handleSave} className="space-y-6 w-full max-w-none overflow-x-hidden">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  <div className="space-y-2">
                    <div className="relative">
                      <ContractorSelect
                        label={t('forms.completedBy')}
                        value={formData.completedBy}
                        onChange={(value) => setFormData(prev => ({ ...prev, completedBy: value }))}
                        authType="admin"
                        required
                      />
                    </div>
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
                    <div className="relative">
                      <ContractorSelect
                        label={t('formFields.supervisor')}
                        value={formData.supervisor}
                        onChange={(value) => setFormData(prev => ({ ...prev, supervisor: value }))}
                        authType="admin"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="relative">
                      <ProjectSelect
                        label={t('formFields.projectName')}
                        value={formData.projectName}
                        onChange={(value) => setFormData(prev => ({ ...prev, projectName: value }))}
                        authType="admin"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <div className="relative">
                      <SubcontractorSelect
                        label={t('forms.companySubcontractor')}
                        value={formData.company}
                        onChange={(value) => setFormData(prev => ({ ...prev, company: value }))}
                        authType="admin"
                        returnValue="name"
                      />
                    </div>
                  </div>
                </div>


                {/* Equipment Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">{t('vehicleInspection.equipmentType')} *</Label>
                    <div className="relative">
                      <Select 
                        value={formData.equipmentType || undefined} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, equipmentType: value }))}
                        key={formData.equipmentType} // Force re-render when value changes
                      >
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
                              className="relative space-y-2"
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
                      
                      {/* Show existing uploaded files */}
                      {formData.uploadedFiles && formData.uploadedFiles.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 mb-2">Existing Files:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
                            {formData.uploadedFiles.map((file, index) => (
                              <div key={index} className="p-2 border border-gray-200 rounded-lg">
                                <a 
                                  href={file.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline block truncate"
                                >
                                  {file.filename}
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Show new files to be uploaded */}
                      {formData.additionalPhotos.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">New Files to Upload:</p>
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
                      modalTitle={`${t('vehicleInspection.signatureTitle')} (Admin Edit)`}
                      modalDescription={t('vehicleInspection.signatureDescription')}
                      signatureLabel={t('vehicleInspection.signaturePrompt')}
                      required
                    />
                  </CardContent>
                </Card>

                {!readOnly && (
                  <Button 
                    type="submit" 
                    disabled={isUpdating || !formData.signature || !formData.equipmentType || !formData.completedBy || !formData.projectName} 
                    className="w-full"
                  >
                    {isUpdating ? t('common.saving') : t('common.saveChanges')}
                  </Button>
                )}
              </form>

              {/* Admin Note */}
              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  {readOnly ? 'Admin View Mode' : 'Admin Edit Mode'}
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {readOnly 
                    ? 'You are viewing this submission as an administrator in read-only mode.' 
                    : 'You are editing this submission as an administrator. Changes will be saved and logged for audit purposes.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}