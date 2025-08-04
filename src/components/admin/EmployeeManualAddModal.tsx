"use client";

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { User, Mail, DollarSign, Users, Plus, ArrowRight, X } from 'lucide-react';

interface SubcontractorData {
  name: string;
}

interface EmployeeData {
  firstName: string;
  lastName: string;
  email: string;
  rate?: string;
  companyName?: string;
}

interface EmployeeManualAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndContinue: (employees: EmployeeData[]) => void;
  onSaveAndAddMore: (employee: EmployeeData) => void;
  availableSubcontractors: SubcontractorData[];
  savedSubcontractors: SubcontractorData[];
}

export function EmployeeManualAddModal({
  isOpen,
  onClose,
  onSaveAndContinue,
  onSaveAndAddMore,
  availableSubcontractors,
  savedSubcontractors,
}: EmployeeManualAddModalProps) {
  const { t } = useTranslation('common');

  const [tempEmployees, setTempEmployees] = useState<EmployeeData[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeData>({
    firstName: '',
    lastName: '',
    email: '',
    rate: '',
    companyName: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateEmployee = (employee: EmployeeData): { [key: string]: string } => {
    const newErrors: { [key: string]: string } = {};

    if (!employee.firstName.trim()) {
      newErrors.firstName = t('admin.errors.firstNameRequired') || 'First name is required';
    }

    if (!employee.lastName.trim()) {
      newErrors.lastName = t('admin.errors.lastNameRequired') || 'Last name is required';
    }

    if (!employee.email.trim()) {
      newErrors.email = t('admin.errors.emailRequired') || 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) {
      newErrors.email = t('admin.errors.invalidEmail') || 'Invalid email format';
    }

    if (employee.rate && isNaN(Number(employee.rate))) {
      newErrors.rate = t('admin.errors.invalidRate') || 'Rate must be a valid number';
    }

    return newErrors;
  };

  const handleSaveAndAddMore = () => {
    const validationErrors = validateEmployee(currentEmployee);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const newEmployee = { ...currentEmployee };
    setTempEmployees((prev) => [...prev, newEmployee]);
    onSaveAndAddMore(newEmployee);

    // Reset form but keep companyName (subcontractor)
    const savedCompanyName = currentEmployee.companyName;
    setCurrentEmployee({ firstName: '', lastName: '', email: '', rate: '', companyName: savedCompanyName });
    setErrors({});
  };

  const handleSaveAndContinue = () => {
    const validationErrors = validateEmployee(currentEmployee);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const allEmployees = [...tempEmployees, currentEmployee];
    onSaveAndContinue(allEmployees);

    // Reset state
    setTempEmployees([]);
    setCurrentEmployee({ firstName: '', lastName: '', email: '', rate: '', companyName: '' });
    setErrors({});
  };

  const handleClose = () => {
    setCurrentEmployee({ firstName: '', lastName: '', email: '', rate: '', companyName: '' });
    setTempEmployees([]);
    setErrors({});
    onClose();
  };

  const removeEmployee = (index: number) => {
    setTempEmployees((prev) => prev.filter((_, i) => i !== index));
  };

  const isFormValid = currentEmployee.firstName.trim() && currentEmployee.lastName.trim() && currentEmployee.email.trim();

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-full overflow-y-auto">
        <AlertDialogHeader className="relative">
          <AlertDialogTitle className="text-lg sm:text-xl pr-8">
            {t('admin.addEmployees')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm sm:text-base">
            {t('admin.addEmployeesOneByOne')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 sm:py-6">
          <div className="space-y-6">
            {tempEmployees.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{tempEmployees.length}</span>
                  </div>
                  <span className="font-medium">
                    {`${tempEmployees.length} ${t('admin.employeesAdded')}`}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeFirstName" className="text-sm font-medium">
                    {t('admin.firstName')} *
                  </Label>
                  <Input
                    id="employeeFirstName"
                    value={currentEmployee.firstName}
                    onChange={(e) => {
                      setCurrentEmployee((prev) => ({ ...prev, firstName: e.target.value }));
                      if (errors.firstName) setErrors((prev) => ({ ...prev, firstName: '' }));
                    }}
                    placeholder={t('admin.enterFirstName') || 'Enter first name'}
                    className={`${errors.firstName ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employeeLastName" className="text-sm font-medium">
                    {t('admin.lastName')} *
                  </Label>
                  <Input
                    id="employeeLastName"
                    value={currentEmployee.lastName}
                    onChange={(e) => {
                      setCurrentEmployee((prev) => ({ ...prev, lastName: e.target.value }));
                      if (errors.lastName) setErrors((prev) => ({ ...prev, lastName: '' }));
                    }}
                    placeholder={t('admin.enterLastName') || 'Enter last name'}
                    className={`${errors.lastName ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.lastName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employeeRate" className="text-sm font-medium">
                    {t('admin.rate')} <span className="text-muted-foreground">{t('admin.optional')}</span>
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="employeeRate"
                      value={currentEmployee.rate}
                      onChange={(e) => {
                        setCurrentEmployee((prev) => ({ ...prev, rate: e.target.value }));
                        if (errors.rate) setErrors((prev) => ({ ...prev, rate: '' }));
                      }}
                      placeholder={t('admin.enterRate') || 'Enter hourly rate'}
                      className={`pl-8 ${errors.rate ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                  </div>
                  {errors.rate && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.rate}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeEmail" className="text-sm font-medium">
                    {t('admin.email')} *
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="employeeEmail"
                      type="email"
                      value={currentEmployee.email}
                      onChange={(e) => {
                        setCurrentEmployee((prev) => ({ ...prev, email: e.target.value }));
                        if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                      }}
                      placeholder={t('admin.enterEmail') || 'employee@company.com'}
                      className={`pl-8 ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employeeSubcontractor" className="text-sm font-medium">
                    {t('admin.subcontractor')} <span className="text-muted-foreground">{t('admin.optional')}</span>
                  </Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                      id="employeeSubcontractor"
                      value={currentEmployee.companyName}
                      onChange={(e) =>
                        setCurrentEmployee((prev) => ({ ...prev, companyName: e.target.value }))
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">{t('admin.selectSubcontractor') || 'Select subcontractor'}</option>
                      {[...savedSubcontractors, ...availableSubcontractors].map((sub, index) => (
                        <option key={`${sub.name}-${index}`} value={sub.name}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {tempEmployees.length > 0 && (
              <div className="mt-6 border rounded-lg overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                          {t('admin.firstName')}
                        </th>
                        <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                          {t('admin.lastName')}
                        </th>
                        <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                          {t('admin.email')}
                        </th>
                        <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                          {t('admin.rate')}
                        </th>
                        <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                          {t('admin.subcontractor')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tempEmployees.map((employee, index) => (
                        <tr
                          key={index}
                          className="border-t hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="p-4">{employee.firstName}</td>
                          <td className="p-4">{employee.lastName}</td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                            {employee.email}
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                            {employee.rate || '-'}
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                            {employee.companyName || '-'}
                          </td>
                          <td className="p-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEmployee(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            {t('admin.cancel')}
          </Button>

          <Button
            onClick={handleSaveAndAddMore}
            disabled={!isFormValid}
            variant="outline"
            className="w-full sm:w-auto order-3 sm:order-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('admin.saveAndAddMore')}
          </Button>

          <Button
            onClick={handleSaveAndContinue}
            disabled={!isFormValid}
            className="w-full sm:w-auto order-1 sm:order-3 bg-green-600 hover:bg-green-700"
          >
            {t('admin.saveAndContinue')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}