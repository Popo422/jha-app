"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SupervisorSelect from "@/components/SupervisorSelect";
import { Send, HelpCircle } from "lucide-react";

export default function HelpPage() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    requestedBy: "",
    subject: "",
    details: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // TODO: Implement backend API call
    console.log("Support request submitted:", formData);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      // Reset form
      setFormData({
        requestedBy: "",
        subject: "",
        details: ""
      });
      alert("Support request submitted successfully!");
    }, 1000);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <HelpCircle className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('admin.helpSupport')}
        </h1>
      </div>

      {/* Support Request Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {t('help.supportRequest.title')}
          </CardTitle>
          <CardDescription>
            {t('help.supportRequest.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Requested By (Supervisor Select) */}
            <div>
              <SupervisorSelect
                label={t('help.supportRequest.requestedBy')}
                value={formData.requestedBy}
                onChange={(value) => handleInputChange('requestedBy', value)}
                required
                authType="admin"
                placeholder={t('help.supportRequest.selectSupervisor')}
              />
            </div>

            {/* Subject */}
            <div>
              <Label htmlFor="subject" className="text-sm font-medium">
                {t('help.supportRequest.subject')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subject"
                type="text"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder={t('help.supportRequest.subjectPlaceholder')}
                required
                className="mt-1"
              />
            </div>

            {/* Issue/Details */}
            <div>
              <Label htmlFor="details" className="text-sm font-medium">
                {t('help.supportRequest.details')} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="details"
                value={formData.details}
                onChange={(e) => handleInputChange('details', e.target.value)}
                placeholder={t('help.supportRequest.detailsPlaceholder')}
                required
                rows={6}
                className="mt-1"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || !formData.requestedBy || !formData.subject || !formData.details}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('help.supportRequest.submitting')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t('help.supportRequest.submit')}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}