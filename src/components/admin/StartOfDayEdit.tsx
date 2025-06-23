"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";

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

interface StartOfDayEditProps {
  submission: Submission;
  onBack: () => void;
}

export default function StartOfDayEdit({ submission, onBack }: StartOfDayEditProps) {
  const [formData, setFormData] = useState(submission.formData);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">Edit Start of Day Report</h2>
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
              <Label htmlFor="timeClocked">Time Clocked In:</Label>
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
              <strong>Instructions:</strong> Any injuries or COVID-19 related symptoms must be reported to your supervisor immediately. Please Answer "Yes" or "No"
            </p>
          </div>

          {/* Health Questions */}
          <Card>
            <CardHeader>
              <CardTitle>Health and Safety Check</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Free from injury */}
              <div className="space-y-2">
                <Label className="font-medium">Are you free from injury when reporting to work?</Label>
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
                  Have you traveled out of the country, visited a "hotspot state" or went on a cruise in the last 14 days?
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
                      value={formData.travelExplanation || ''}
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

          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack}>Cancel</Button>
            <Button>Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}