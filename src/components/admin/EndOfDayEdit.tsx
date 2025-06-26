"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast, useToast } from "@/components/ui/toast";
import { useUpdateSubmissionMutation, useDeleteAttachmentMutation } from "@/lib/features/submissions/submissionsApi";
import { ArrowLeft } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import AttachmentPreview from "@/components/AttachmentPreview";
import { useSelector } from "react-redux";
import type { RootState } from "@/lib/store";

interface Submission {
  id: string;
  userId: string;
  completedBy: string;
  date: string;
  dateTimeClocked?: string;
  company: string;
  jobSite: string;
  submissionType: string;
  formData: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface EndOfDayEditProps {
  submission: Submission;
  onBack: () => void;
}

export default function EndOfDayEdit({ submission, onBack }: EndOfDayEditProps) {
  const [formData, setFormData] = useState(submission.formData);
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());
  const [updateSubmission, { isLoading }] = useUpdateSubmissionMutation();
  const [deleteAttachment] = useDeleteAttachmentMutation();
  const { toast, showToast, hideToast } = useToast();
  const signatureRef = useRef<SignatureCanvas>(null);
  
  const auth = useSelector((state: RootState) => state.auth);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "radio") {
      const booleanValue = value === "true" ? true : value === "false" ? false : null;
      setFormData((prev: any) => ({
        ...prev,
        [name]: booleanValue,
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSignatureClear = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setFormData((prev: any) => ({
        ...prev,
        signature: "",
      }));
    }
  };

  const handleSignatureEnd = () => {
    if (signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL();
      setFormData((prev: any) => ({
        ...prev,
        signature: signatureData,
      }));
    }
  };

  const handleSignatureStart = () => {
    // If there's an existing signature URL (not base64), clear it when user starts drawing
    if (formData.signature && !formData.signature.startsWith('data:image/')) {
      setFormData((prev: any) => ({
        ...prev,
        signature: "",
      }));
    }
  };

  const handleDeleteAttachment = useCallback(async (fileUrl: string, fileName: string) => {
    try {
      setDeletingFiles(prev => new Set(prev).add(fileUrl));
      
      const result = await deleteAttachment({
        submissionId: submission.id,
        fileUrl,
        fileName
      }).unwrap();

      if (result.success) {
        // Remove the file from local state
        setFormData((prev: any) => ({
          ...prev,
          uploadedFiles: (prev.uploadedFiles || []).filter((file: any) => file.url !== fileUrl)
        }));
        showToast('Attachment deleted successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to delete attachment', 'error');
      }
    } catch (error: any) {
      showToast(error?.data?.error || 'Failed to delete attachment', 'error');
    } finally {
      setDeletingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileUrl);
        return newSet;
      });
    }
  }, [submission.id, deleteAttachment, showToast]);

  const handleSave = useCallback(async () => {
    try {
      // Prepare dateTimeClocked - combine date with time if time is provided
      let dateTimeClocked = null;
      if (formData.timeClocked && formData.date) {
        dateTimeClocked = `${formData.date}T${formData.timeClocked}:00`;
      }else{
        dateTimeClocked = submission.dateTimeClocked
      }

      const result = await updateSubmission({
        id: submission.id,
        completedBy: formData.completedBy,
        date: formData.date,
        company: formData.company,
        jobSite: formData.jobSite,
        dateTimeClocked: dateTimeClocked  ,
        formData: formData
      }).unwrap();

      if (result.success) {
        showToast('Changes saved successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to save changes', 'error');
      }
    } catch (error: any) {
      showToast(error?.data?.error || 'Failed to save changes', 'error');
    }
  }, [formData, submission.id, updateSubmission, showToast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">Edit End of Day Report</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="completedBy">Completed by:</Label>
              <Input
                id="completedBy"
                name="completedBy"
                value={formData.completedBy || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date:</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supervisor">Supervisor:</Label>
              <Input
                id="supervisor"
                name="supervisor"
                value={formData.supervisor || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobSite">Job Site:</Label>
              <Input
                id="jobSite"
                name="jobSite"
                value={formData.jobSite || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company:</Label>
              <Input
                id="company"
                name="company"
                value={formData.company || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeClocked">Time Clocked Out:</Label>
              <Input
                id="timeClocked"
                name="timeClocked"
                type="time"
                value={formData.timeClocked || ''}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Instructions:</strong> {`Any injuries or COVID-19 related symptoms must be reported to your supervisor immediately. Please Answer "Yes" or "No"`}
            </p>
          </div>

          {/* Health Questions */}
          <Card>
            <CardHeader>
              <CardTitle>End of Day Health and Safety Check</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Free from injury */}
              <div className="space-y-2">
                <Label className="font-medium">Are you leaving the job site free from any injuries?</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="injury-yes"
                      name="freeFromInjury"
                      value="true"
                      checked={formData.freeFromInjury === true}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="injury-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="injury-no"
                      name="freeFromInjury"
                      value="false"
                      checked={formData.freeFromInjury === false}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="injury-no">No</Label>
                  </div>
                </div>
              </div>

              {/* Completed JHA */}
              <div className="space-y-2">
                <Label className="font-medium">Did you complete the JHA form today?</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="jha-yes"
                      name="completedJHA"
                      value="true"
                      checked={formData.completedJHA === true}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="jha-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="jha-no"
                      name="completedJHA"
                      value="false"
                      checked={formData.completedJHA === false}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="jha-no">No</Label>
                  </div>
                </div>
              </div>

              {/* Free from fever */}
              <div className="space-y-2">
                <Label className="font-medium">Are you free from fever when reporting to work?</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="fever-yes"
                      name="freeFromFever"
                      value="true"
                      checked={formData.freeFromFever === true}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="fever-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="fever-no"
                      name="freeFromFever"
                      value="false"
                      checked={formData.freeFromFever === false}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="fever-no">No</Label>
                  </div>
                </div>
              </div>

              {/* Free from COVID symptoms */}
              <div className="space-y-2">
                <Label className="font-medium">
                  Are you free of COVID-19 symptoms when reporting to work? (Symptoms include fever, sore throat, headache, body aches, fatigue, runny nose or coughing.)
                </Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="covid-symptoms-yes"
                      name="freeFromCovidSymptoms"
                      value="true"
                      checked={formData.freeFromCovidSymptoms === true}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="covid-symptoms-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="covid-symptoms-no"
                      name="freeFromCovidSymptoms"
                      value="false"
                      checked={formData.freeFromCovidSymptoms === false}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="covid-symptoms-no">No</Label>
                  </div>
                </div>
              </div>

              {/* Free from direct exposure */}
              <div className="space-y-2">
                <Label className="font-medium">
                  Are you free from direct exposure to a positive COVID-19 or suspected positive case?
                </Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="exposure-yes"
                      name="freeFromDirectExposure"
                      value="true"
                      checked={formData.freeFromDirectExposure === true}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="exposure-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="exposure-no"
                      name="freeFromDirectExposure"
                      value="false"
                      checked={formData.freeFromDirectExposure === false}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="exposure-no">No</Label>
                  </div>
                </div>
              </div>

              {/* Travel question */}
              <div className="space-y-2">
                <Label className="font-medium">
                  {`Have you traveled out of the country, visited a "hotspot state" or went on a cruise in the last 14 days?`}
                </Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="travel-yes"
                      name="traveledOutOfCountry"
                      value="true"
                      checked={formData.traveledOutOfCountry === true}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="travel-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="travel-no"
                      name="traveledOutOfCountry"
                      value="false"
                      checked={formData.traveledOutOfCountry === false}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="travel-no">No</Label>
                  </div>
                </div>
              </div>

              {/* Physical distancing */}
              <div className="space-y-2">
                <Label className="font-medium">
                  Is everyone on site practicing physical distancing and have access to proper facial secretion suppressor and sanitary agents?
                </Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="distancing-yes"
                      name="physicalDistancing"
                      value="true"
                      checked={formData.physicalDistancing === true}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="distancing-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="distancing-no"
                      name="physicalDistancing"
                      value="false"
                      checked={formData.physicalDistancing === false}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="distancing-no">No</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Attachments Section */}
          <Card>
            <CardHeader>
              <CardTitle>File Attachments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Attached Files:</Label>
                {formData.uploadedFiles && formData.uploadedFiles.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {formData.uploadedFiles.map((file: any, index: number) => (
                      <AttachmentPreview
                        key={index}
                        file={{
                          name: file.filename,
                          url: file.url,
                          filename: file.filename
                        }}
                        showDeleteButton={true}
                        onDelete={() => handleDeleteAttachment(file.url, file.filename)}
                        isDeleting={deletingFiles.has(file.url)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No files attached</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Signature Section */}
          <Card>
            <CardHeader>
              <CardTitle>Digital Signature</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Employee Signature:</Label>
                <div className="border border-gray-300 rounded-lg p-2 bg-white">
                  <SignatureCanvas
                    ref={signatureRef}
                    canvasProps={{
                      width: 400,
                      height: 200,
                      className: "signature-canvas w-full max-w-md mx-auto border rounded"
                    }}
                    onBegin={handleSignatureStart}
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
                {formData.signature && (
                  <div className="mt-2">
                    <Label>Current Signature:</Label>
                    <div className="border border-gray-200 rounded p-2">
                      <img src={formData.signature} alt="Current signature" className="max-w-md max-h-40" />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack}>Cancel</Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        onClose={hideToast}
      />
    </div>
  );
}