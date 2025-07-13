"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { useUpdateModulesMutation } from "@/lib/features/modules/modulesApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Settings, AlertCircle, Link, Copy, Download, QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ModulesResponse } from "@/lib/features/modules/modulesApi";

interface ModuleConfigurationProps {
  modulesData?: ModulesResponse;
  isLoading: boolean;
  onSuccess: () => void;
}

export function ModuleConfiguration({ modulesData, isLoading, onSuccess }: ModuleConfigurationProps) {
  const { t } = useTranslation('common');
  const [updateModules, { isLoading: isUpdating }] = useUpdateModulesMutation();
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedModule, setCopiedModule] = useState<string | null>(null);
  const [selectedModuleForLink, setSelectedModuleForLink] = useState<string | null>(null);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  // Initialize selected modules when data loads
  useEffect(() => {
    if (modulesData?.enabledModules) {
      setSelectedModules(modulesData.enabledModules);
    }
  }, [modulesData]);

  const handleModuleToggle = useCallback((moduleId: string, checked: boolean) => {
    const newSelected = checked 
      ? [...selectedModules, moduleId]
      : selectedModules.filter(id => id !== moduleId);
    
    setSelectedModules(newSelected);
    
    // Create copies of arrays before sorting to avoid mutating readonly arrays
    const newSelectedSorted = [...newSelected].sort();
    const currentEnabledSorted = [...(modulesData?.enabledModules || [])].sort();
    setHasChanges(JSON.stringify(newSelectedSorted) !== JSON.stringify(currentEnabledSorted));
    
    setSuccessMessage('');
    setErrorMessage('');
  }, [selectedModules, modulesData?.enabledModules]);

  const handleSave = useCallback(async () => {
    try {
      const result = await updateModules({ enabledModules: selectedModules }).unwrap();
      setSuccessMessage(result.message || t('admin.moduleConfigurationUpdated'));
      setErrorMessage('');
      setHasChanges(false);
      onSuccess(); // Trigger refetch in parent
    } catch (error: any) {
      setErrorMessage(error?.data?.error || t('admin.failedToUpdateModuleConfiguration'));
      setSuccessMessage('');
    }
  }, [selectedModules, updateModules, onSuccess]);

  const handleReset = useCallback(() => {
    if (modulesData?.enabledModules) {
      setSelectedModules(modulesData.enabledModules);
      setHasChanges(false);
      setSuccessMessage('');
      setErrorMessage('');
    }
  }, [modulesData?.enabledModules]);

  const getModuleLink = useCallback((moduleId: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    
    switch (moduleId) {
      case 'start-of-day':
        return `${baseUrl}/contractor-forms/start-of-day-report`;
      case 'end-of-day':
        return `${baseUrl}/contractor-forms/end-of-day-report`;
      case 'job-hazard-analysis':
        return `${baseUrl}/contractor-forms/job-hazard-analysis`;
      case 'timesheet':
        return `${baseUrl}/timesheet`;
      default:
        return `${baseUrl}/contractor-forms`;
    }
  }, []);

  const handleCopyLink = useCallback(async (moduleId: string) => {
    try {
      const link = getModuleLink(moduleId);
      await navigator.clipboard.writeText(link);
      setCopiedModule(moduleId);
      
      // Clear the copied state after 2 seconds
      setTimeout(() => {
        setCopiedModule(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for browsers that don't support clipboard API
      const link = getModuleLink(moduleId);
      const textarea = document.createElement('textarea');
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      setCopiedModule(moduleId);
      setTimeout(() => {
        setCopiedModule(null);
      }, 2000);
    }
  }, [getModuleLink]);

  const generateQRCode = useCallback(async (text: string) => {
    try {
      // Use qrcode library's toDataURL method
      const qrDataURL = await QRCode.toDataURL(text, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      return qrDataURL;
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      return null;
    }
  }, []);

  const handleOpenModal = useCallback(async (moduleId: string) => {
    setSelectedModuleForLink(moduleId);
    setIsGeneratingQR(true);
    setQrCodeDataURL(null);
    
    const link = getModuleLink(moduleId);
    const qrDataURL = await generateQRCode(link);
    
    setQrCodeDataURL(qrDataURL);
    setIsGeneratingQR(false);
  }, [getModuleLink, generateQRCode]);

  const handleDownloadQR = useCallback(() => {
    if (qrCodeDataURL && selectedModuleForLink) {
      const link_download = document.createElement('a');
      link_download.href = qrCodeDataURL;
      link_download.download = `${selectedModuleForLink}-qr-code.png`;
      document.body.appendChild(link_download);
      link_download.click();
      document.body.removeChild(link_download);
    }
  }, [qrCodeDataURL, selectedModuleForLink]);

  const getModuleName = useCallback((moduleId: string) => {
    const moduleData = modulesData?.availableModules?.find(m => m.id === moduleId);
    return moduleData?.name || moduleId;
  }, [modulesData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-start space-x-3">
              <Skeleton className="h-5 w-5 mt-0.5" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-5 w-5" />
{t('admin.moduleConfiguration')}
        </CardTitle>
        <CardDescription>
{t('admin.selectModulesDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800 flex items-center">
            <Check className="h-4 w-4 mr-2" />
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            {errorMessage}
          </div>
        )}

        {/* Module Selection */}
        <div className="space-y-4">
          {modulesData?.availableModules?.map((module) => {
            const isChecked = selectedModules.includes(module.id);
            const isCopied = copiedModule === module.id;
            return (
              <div key={module.id} className="flex items-start space-x-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <Checkbox
                  id={module.id}
                  checked={isChecked}
                  onCheckedChange={(checked) => handleModuleToggle(module.id, !!checked)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <label 
                        htmlFor={module.id} 
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                      >
                        {module.name}
                      </label>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {module.description}
                      </p>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-3 text-xs px-2 py-1 h-7"
                          disabled={!isChecked}
                          onClick={() => handleOpenModal(module.id)}
                        >
                          <Link className="h-3 w-3 mr-1" />
{t('admin.generateLink')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>{t('admin.shareModuleLink').replace('{{module}}', getModuleName(module.id))}</DialogTitle>
                          <DialogDescription>
  {t('admin.generateLinkDescription')}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                          {/* QR Code */}
                          <div className="flex flex-col items-center space-y-4">
                            <div className="p-4 bg-white rounded-lg border">
                              {isGeneratingQR ? (
                                <div className="w-48 h-48 flex items-center justify-center">
                                  <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                                    <p className="text-sm text-gray-600">{t('admin.generatingQRCode')}</p>
                                  </div>
                                </div>
                              ) : qrCodeDataURL ? (
                                <img 
                                  src={qrCodeDataURL} 
                                  alt={`QR Code for ${getModuleName(selectedModuleForLink || '')}`}
                                  className="w-48 h-48"
                                />
                              ) : (
                                <div className="w-48 h-48 flex items-center justify-center text-gray-400">
                                  <QrCode className="h-16 w-16" />
                                </div>
                              )}
                            </div>
                            <Button
                              onClick={handleDownloadQR}
                              variant="outline"
                              className="w-full"
                              disabled={!qrCodeDataURL || isGeneratingQR}
                            >
                              <Download className="h-4 w-4 mr-2" />
{t('admin.downloadQRCode')}
                            </Button>
                          </div>

                          {/* Direct Link */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium">{t('admin.directLink')}:</h4>
                            <div className="space-y-2">
                              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded border text-sm font-mono break-all">
                                {selectedModuleForLink ? getModuleLink(selectedModuleForLink) : ''}
                              </div>
                              <Button
                                onClick={() => selectedModuleForLink && handleCopyLink(selectedModuleForLink)}
                                variant="outline"
                                size="sm"
                                className="w-full"
                                disabled={!selectedModuleForLink}
                              >
                                {copiedModule === selectedModuleForLink ? (
                                  <>
                                    <Check className="h-4 w-4 mr-2" />
{t('admin.copied')}
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-4 w-4 mr-2" />
{t('admin.copyLink')}
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isUpdating || selectedModules.length === 0}
            className="flex-1 sm:flex-none"
          >
{isUpdating ? t('common.saving') : t('common.saveChanges')}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={!hasChanges || isUpdating}
            className="flex-1 sm:flex-none"
          >
{t('common.reset')}
          </Button>
        </div>

        {/* Warning */}
        {selectedModules.length === 0 && (
          <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800 flex items-start">
            <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <div>
{t('admin.moduleSelectionWarning')}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}