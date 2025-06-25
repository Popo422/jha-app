"use client";

import { useState, useEffect, useRef } from "react";
import { useSubmitFormMutation } from "@/lib/features/submissions/submissionsApi";
import Header from "@/components/Header";
import AppSidebar from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import SignatureCanvas from "react-signature-canvas";

interface StartOfDayReportFormData {
  completedBy: string;
  date: string;
  supervisor: string;
  jobSite: string;
  company: string;
  timeClocked: string;
  freeFromInjury: boolean | null;
  freeFromFever: boolean | null;
  freeFromCovidSymptoms: boolean | null;
  freeFromDirectExposure: boolean | null;
  traveledOutOfCountry: boolean | null;
  travelExplanation: string;
  physicalDistancing: boolean | null;
  signature: string;
}

export default function StartOfDayReportPage() {
  const [formData, setFormData] = useState<StartOfDayReportFormData>({
    completedBy: "",
    date: new Date().toISOString().split("T")[0],
    supervisor: "",
    jobSite: "",
    company: "",
    timeClocked: "",
    freeFromInjury: null,
    freeFromFever: null,
    freeFromCovidSymptoms: null,
    freeFromDirectExposure: null,
    traveledOutOfCountry: null,
    travelExplanation: "",
    physicalDistancing: null,
    signature: "",
  });

  const signatureRef = useRef<SignatureCanvas>(null);

  const [submitForm, { isLoading, isSuccess, isError, error, reset }] = useSubmitFormMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "radio") {
      const booleanValue = value === "true" ? true : value === "false" ? false : null;
      setFormData((prev) => ({
        ...prev,
        [name]: booleanValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSignatureClear = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setFormData((prev) => ({
        ...prev,
        signature: "",
      }));
    }
  };

  const handleSignatureEnd = () => {
    if (signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL();
      setFormData((prev) => ({
        ...prev,
        signature: signatureData,
      }));
    }
  };

  // Reset form on successful submission
  useEffect(() => {
    if (isSuccess) {
      setFormData({
        completedBy: "",
        date: new Date().toISOString().split("T")[0],
        supervisor: "",
        jobSite: "",
        company: "",
        timeClocked: "",
        freeFromInjury: null,
        freeFromFever: null,
        freeFromCovidSymptoms: null,
        freeFromDirectExposure: null,
        traveledOutOfCountry: null,
        travelExplanation: "",
        physicalDistancing: null,
        signature: "",
      });
      if (signatureRef.current) {
        signatureRef.current.clear();
      }
    }
  }, [isSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset(); // Reset mutation state

    // Convert time to full datetime for supervisor clock in
    const clockInDateTime = formData.timeClocked ? 
      new Date(`${formData.date}T${formData.timeClocked}`).toISOString() : undefined;

    await submitForm({
      submissionType: 'start-of-day',
      jobSite: formData.jobSite,
      date: formData.date,
      dateTimeClocked: clockInDateTime,
      formData: {
        completedBy: formData.completedBy,
        date: formData.date,
        supervisor: formData.supervisor,
        company: formData.company,
        timeClocked: formData.timeClocked,
        freeFromInjury: formData.freeFromInjury,
        freeFromFever: formData.freeFromFever,
        freeFromCovidSymptoms: formData.freeFromCovidSymptoms,
        freeFromDirectExposure: formData.freeFromDirectExposure,
        traveledOutOfCountry: formData.traveledOutOfCountry,
        travelExplanation: formData.travelExplanation,
        physicalDistancing: formData.physicalDistancing,
        signature: formData.signature,
      },
    });
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
            <h1 className="text-3xl font-bold text-foreground">Start of Day Report</h1>
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
                    <Input
                      id="jobSite"
                      name="jobSite"
                      value={formData.jobSite}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company:</Label>
                    <Input
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeClocked">Time Clocked In:</Label>
                    <Input
                      id="timeClocked"
                      name="timeClocked"
                      type="time"
                      className="w-fit"
                      value={formData.timeClocked}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Instructions:</strong> {`Any injuries or COVID-19 related symptoms must be reported to your supervisor immediately. Please Answer "Yes" or "No"`}
                  </p>
                </div>

                {/* Health Check Questions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md md:text-xl">
                      Health and Safety Check
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Free from injury */}
                    <div className="space-y-2">
                      <Label className="font-medium">
                        Are you free from injury when reporting to work?
                      </Label>
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

                    {/* Free from fever */}
                    <div className="space-y-2">
                      <Label className="font-medium">
                        Are you free from fever when reporting to work?
                      </Label>
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
                      
                      {/* Conditional explanation field */}
                      {formData.traveledOutOfCountry === true && (
                        <div className="mt-3 space-y-2 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border-l-4 border-orange-400">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                            <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                              Follow-up Question
                            </span>
                          </div>
                          <Label htmlFor="travelExplanation" className="text-sm font-medium">
                            Explanation:
                          </Label>
                          <Textarea
                            id="travelExplanation"
                            name="travelExplanation"
                            value={formData.travelExplanation}
                            onChange={handleInputChange}
                            placeholder="Please provide details about your travel"
                            rows={3}
                            className="w-full"
                          />
                        </div>
                      )}
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

                {/* Signature Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md md:text-xl">Digital Signature</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Please sign below to confirm the accuracy of this report:</Label>
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
                    Start of Day Report submitted successfully!
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
  )
}