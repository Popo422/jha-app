"use client";

import { useState, useEffect } from "react";
import { useCreateContractorMutation, useUpdateContractorMutation, type Contractor } from "@/lib/features/contractors/contractorsApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { X, Mail } from "lucide-react";

interface ContractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractor?: Contractor | null;
}

export default function ContractorModal({ isOpen, onClose, contractor }: ContractorModalProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    code: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string>("");

  const [createContractor, { isLoading: isCreating, error: createError }] = useCreateContractorMutation();
  const [updateContractor, { isLoading: isUpdating, error: updateError }] = useUpdateContractorMutation();

  const isLoading = isCreating || isUpdating;
  const error = createError || updateError;
  const isEditing = !!contractor;

  // Reset form when modal opens/closes or contractor changes
  useEffect(() => {
    if (isOpen) {
      if (contractor) {
        setFormData({
          firstName: contractor.firstName,
          lastName: contractor.lastName,
          email: contractor.email,
          code: contractor.code,
        });
      } else {
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          code: "",
        });
      }
      setErrors({});
      setEmailMessage("");
    }
  }, [isOpen, contractor]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.code.trim()) {
      newErrors.code = "Contractor code is required";
    } else if (formData.code.trim().length < 2) {
      newErrors.code = "Contractor code must be at least 2 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      if (isEditing && contractor) {
        await updateContractor({
          id: contractor.id,
          ...formData,
        }).unwrap();
      } else {
        await createContractor(formData).unwrap();
      }
      onClose();
    } catch (error) {
      // Error handling is done through RTK Query error state
      console.error('Failed to save contractor:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const getErrorMessage = () => {
    if (error && 'data' in error && typeof error.data === 'object' && error.data && 'error' in error.data) {
      return (error.data as any).error;
    }
    return 'An error occurred while saving the contractor';
  };

  const handleSendCodeEmail = async () => {
    if (!contractor?.id) return;

    setIsSendingEmail(true);
    setEmailMessage("");

    try {
      const response = await fetch('/api/email/send-code-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractorId: contractor.id,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setEmailMessage("✅ Code update email sent successfully!");
      } else {
        setEmailMessage(`❌ Failed to send email: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending code update email:', error);
      setEmailMessage("❌ Failed to send email. Please try again.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="flex flex-row items-center justify-between">
          <AlertDialogTitle>
            {isEditing ? 'Edit Contractor' : 'Add New Contractor'}
          </AlertDialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={errors.firstName ? "border-red-500" : ""}
                disabled={isLoading}
              />
              {errors.firstName && (
                <p className="text-sm text-red-500">{errors.firstName}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={errors.lastName ? "border-red-500" : ""}
                disabled={isLoading}
              />
              {errors.lastName && (
                <p className="text-sm text-red-500">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? "border-red-500" : ""}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Contractor Code</Label>
            <Input
              id="code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="e.g., CONT001"
              className={errors.code ? "border-red-500" : ""}
              disabled={isLoading}
            />
            {errors.code && (
              <p className="text-sm text-red-500">{errors.code}</p>
            )}
            <p className="text-xs text-muted-foreground">
              This code will be used for contractor login
            </p>
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSendCodeEmail}
                disabled={isSendingEmail || isLoading}
                className="mt-2"
              >
                <Mail className="h-4 w-4 mr-2" />
                {isSendingEmail ? 'Sending...' : 'Send Updated Code Email'}
              </Button>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {getErrorMessage()}
            </div>
          )}

          {emailMessage && (
            <div className={`p-3 rounded-lg text-sm ${
              emailMessage.includes('✅') 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            }`}>
              {emailMessage}
            </div>
          )}

          <AlertDialogFooter className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : (isEditing ? 'Update Contractor' : 'Add Contractor')}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}