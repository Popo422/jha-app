"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Calendar, 
  Upload, 
  Plus
} from "lucide-react";

interface ProjectTasksChoiceModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export default function ProjectTasksChoiceModal({ 
  isOpen, 
  onOpenChange, 
  projectId 
}: ProjectTasksChoiceModalProps) {
  const router = useRouter();

  const handleManualChoice = () => {
    onOpenChange(false);
    // Route to manual entry page
    router.push(`/admin/project-tasks/manual/${projectId}`);
  };

  const handleUploadChoice = () => {
    onOpenChange(false);
    // Route to upload workflow page
    router.push(`/admin/project-tasks/upload/${projectId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-8">
        <DialogTitle className="sr-only">Add or Upload Your Project Schedule</DialogTitle>
        <div className="space-y-8">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <Calendar className="w-12 h-12 mx-auto text-teal-600" />
            <h2 className="text-2xl font-bold">Add or Upload Your Project Schedule</h2>
            <p className="text-muted-foreground">
              Scan your existing schedule using AI or create a project schedule manually.
            </p>
          </div>

          {/* Choice Cards - exactly like the onboarding design */}
          <div className="flex items-stretch gap-4 sm:gap-6">
            
            {/* Manual Entry Card */}
            <div className="flex-1">
              <Card
                className="border-2 border-dashed border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer transition-colors h-full"
                onClick={handleManualChoice}
              >
                <CardContent className="p-6 text-center h-full flex flex-col justify-center">
                  <Plus className="w-12 h-12 mx-auto text-blue-600 mb-4" />
                  <h3 className="font-semibold mb-2 text-lg">Add Manually</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add tasks one by one with full control
                  </p>
                  <Button variant="outline" size="sm" className="mt-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* OR Divider */}
            <div className="text-muted-foreground flex items-center justify-center py-4 sm:py-0">
              <span className="bg-background px-4 py-2 rounded-full border text-sm">or</span>
            </div>

            {/* Upload Card */}
            <div className="flex-1">
              <Card
                className="border-2 border-dashed border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 cursor-pointer transition-colors h-full"
                onClick={handleUploadChoice}
              >
                <CardContent className="p-6 text-center h-full flex flex-col justify-center">
                  <Upload className="w-12 h-12 mx-auto text-green-600 mb-4" />
                  <h3 className="font-semibold mb-2 text-lg">Bulk Upload</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload your schedule file and extract with AI
                  </p>
                  <Button variant="outline" size="sm" className="mt-auto">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="flex justify-between items-center pt-4">
            <Button 
              variant="link" 
              onClick={() => onOpenChange(false)}
              className="text-blue-600 hover:text-blue-800 underline p-0"
            >
              Go Back
            </Button>
            
            <Button 
              onClick={() => onOpenChange(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              Finish
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}