'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import AttachmentPreview from '@/components/AttachmentPreview';

interface EvidenceStepProps {
  data: {
    evidenceFiles: File[];
    uploadedFiles?: { filename: string; url: string }[];
  };
  updateData: (updates: Partial<{
    evidenceFiles: File[];
  }>) => void;
  readOnly?: boolean;
}

export default function EvidenceStep({ data, updateData, readOnly = false }: EvidenceStepProps) {
  const { t } = useTranslation('common');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    updateData({ evidenceFiles: [...data.evidenceFiles, ...files] });
  };

  const removeFile = (index: number) => {
    const newFiles = data.evidenceFiles.filter((_, i) => i !== index);
    updateData({ evidenceFiles: newFiles });
  };


  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-base text-gray-700 dark:text-gray-300">
          Upload any images or videos to support the near miss report.
        </p>
        
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8">
          <div className="text-center">
            <Upload className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" />
            <div className="mt-4">
              <Label
                htmlFor="evidence-files"
                className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white ${
                  readOnly 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                }`}
              >
                Upload File
              </Label>
              <Input
                id="evidence-files"
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                disabled={readOnly}
                className="hidden"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Support formats: Images, Videos, PDF, DOC, TXT files
            </p>
          </div>
        </div>

        {(data.evidenceFiles.length > 0 || (data.uploadedFiles && data.uploadedFiles.length > 0)) && (
          <div className="space-y-4">
            {/* New uploaded files */}
            {data.evidenceFiles.length > 0 && (
              <div className="space-y-2">
                <Label>New Files to Upload:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.evidenceFiles.map((file, index) => (
                    <AttachmentPreview
                      key={`new-${index}`}
                      file={file}
                      onDelete={() => removeFile(index)}
                      showDeleteButton={!readOnly}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Existing uploaded files from database */}
            {data.uploadedFiles && data.uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Previously Uploaded Files:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.uploadedFiles.map((file, index) => (
                    <div key={`existing-${index}`} className="relative group">
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {file.filename}
                            </p>
                            <a 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              View File
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}