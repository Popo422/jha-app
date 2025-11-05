"use client";

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useGetContractorsQuery } from '@/lib/features/contractors/contractorsApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import SignatureButton from '@/components/SignatureButton';

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

interface FieldEmployee {
  id: string;
  name: string;
  working: boolean;
  hoursWorked: number;
  statusAtLunch: 'free-of-injury' | 'injured';
  statusAtEndOfDay: 'free-of-injury' | 'injured';
  signature: string;
}

interface EndOfDayV2FormData {
  fieldEmployees: FieldEmployee[];
  subcontractorName: string;
  [key: string]: any;
}

interface FieldEmployeesStepProps {
  data: EndOfDayV2FormData;
  updateData: (updates: Partial<EndOfDayV2FormData>) => void;
  readOnly?: boolean;
}

export default function FieldEmployeesStep({ data, updateData, readOnly = false }: FieldEmployeesStepProps) {
  const { t } = useTranslation('common');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    name: '',
    hoursWorked: 8,
    working: 'yes'
  });

  // Get contractors for the selected subcontractor company
  const { data: contractorsData, isLoading: isLoadingContractors } = useGetContractorsQuery({
    company: data.subcontractorName,
    page: 1,
    pageSize: 1000,
    authType: 'contractor'
  }, {
    skip: !data.subcontractorName
  });

  // Get all contractors for the modal dropdown
  const { data: allContractorsData, isLoading: isLoadingAllContractors } = useGetContractorsQuery({
    page: 1,
    pageSize: 1000,
    authType: 'contractor'
  });

  // Load initial contractors from subcontractor company
  useEffect(() => {
    if (contractorsData?.contractors && data.fieldEmployees.length === 0) {
      const initialEmployees = contractorsData.contractors.map(contractor => ({
        id: generateId(),
        name: `${contractor.firstName} ${contractor.lastName}`,
        working: true,
        hoursWorked: 8,
        statusAtLunch: 'free-of-injury' as const,
        statusAtEndOfDay: 'free-of-injury' as const,
        signature: '',
      }));
      
      updateData({ fieldEmployees: initialEmployees });
    }
  }, [contractorsData, data.fieldEmployees.length, updateData]);

  const handleAddWorker = () => {
    if (!modalData.name) return;
    
    // Find the contractor by email to get their name
    const selectedContractor = allContractorsData?.contractors.find(
      contractor => contractor.email === modalData.name
    );
    
    if (!selectedContractor) return;
    
    const contractorName = `${selectedContractor.firstName} ${selectedContractor.lastName}`;
    
    const newEmployee: FieldEmployee = {
      id: generateId(),
      name: contractorName,
      working: modalData.working === 'yes',
      hoursWorked: modalData.hoursWorked,
      statusAtLunch: 'free-of-injury',
      statusAtEndOfDay: 'free-of-injury',
      signature: '',
    };

    updateData({
      fieldEmployees: [...data.fieldEmployees, newEmployee]
    });

    // Reset modal
    setModalData({
      name: '',
      hoursWorked: 8,
      working: 'yes'
    });
    setIsModalOpen(false);
  };

  const removeWorker = (id: string) => {
    updateData({
      fieldEmployees: data.fieldEmployees.filter(emp => emp.id !== id)
    });
  };

  const updateEmployee = (id: string, updates: Partial<FieldEmployee>) => {
    updateData({
      fieldEmployees: data.fieldEmployees.map(emp =>
        emp.id === id ? { ...emp, ...updates } : emp
      )
    });
  };

  // Generate hours options (0.5 to 16 hours in 0.5 increments)
  const hoursOptions: { value: number; label: string }[] = [];
  for (let i = 0.5; i <= 16; i += 0.5) {
    hoursOptions.push({ value: i, label: `${i} hours` });
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Field Employees
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              View and add workers that were present
            </p>
          </div>
          {!readOnly && (
            <Button 
              type="button" 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Worker
            </Button>
          )}
        </div>

        {/* Loading State */}
        {isLoadingContractors && data.fieldEmployees.length === 0 ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600 dark:text-gray-400">Loading workers...</p>
          </div>
        ) : data.fieldEmployees.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No workers available. Click Add Worker to add contractors.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Header */}
              <div className="grid grid-cols-[2fr_minmax(80px,auto)_1fr_1.5fr_1.5fr_2fr_minmax(80px,auto)] gap-4 py-3 px-4 bg-gray-50 dark:bg-gray-800 rounded-t-lg border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                <div>Name</div>
                <div className="text-center">Working</div>
                <div>Hours Worked</div>
                <div>Status at Lunch</div>
                <div>Status at End of Day</div>
                <div>Signature</div>
                <div className="text-center">Actions</div>
              </div>

              {/* Employee Rows */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg">
                {data.fieldEmployees.map((employee, index) => (
                  <div key={employee.id} className={`grid grid-cols-[2fr_minmax(80px,auto)_1fr_1.5fr_1.5fr_2fr_minmax(80px,auto)] gap-4 py-4 px-4 ${
                    index !== data.fieldEmployees.length - 1 
                      ? 'border-b border-gray-200 dark:border-gray-700' 
                      : ''
                  }`}>
                    {/* Name */}
                    <div>
                      <Input
                        value={employee.name}
                        onChange={(e) => updateEmployee(employee.id, { name: e.target.value })}
                        placeholder="Enter Name"
                        required
                        className="text-sm"
                        readOnly={readOnly}
                      />
                    </div>

                    {/* Working */}
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={employee.working}
                        onCheckedChange={(checked) => 
                          updateEmployee(employee.id, { working: checked === true })
                        }
                        disabled={readOnly}
                      />
                    </div>

                    {/* Hours Worked */}
                    <div>
                      <Select 
                        value={employee.hoursWorked.toString()} 
                        onValueChange={(value) => updateEmployee(employee.id, { hoursWorked: parseFloat(value) })}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-48 overflow-y-auto">
                          {hoursOptions.map((hours) => (
                            <SelectItem key={hours.value} value={hours.value.toString()}>
                              {hours.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status at Lunch */}
                    <div>
                      <Select 
                        value={employee.statusAtLunch} 
                        onValueChange={(value: 'free-of-injury' | 'injured') => 
                          updateEmployee(employee.id, { statusAtLunch: value })
                        }
                        disabled={readOnly}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free-of-injury">Free of Injury</SelectItem>
                          <SelectItem value="injured">Injured</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status at End of Day */}
                    <div>
                      <Select 
                        value={employee.statusAtEndOfDay} 
                        onValueChange={(value: 'free-of-injury' | 'injured') => 
                          updateEmployee(employee.id, { statusAtEndOfDay: value })
                        }
                        disabled={readOnly}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free-of-injury">Free of Injury</SelectItem>
                          <SelectItem value="injured">Injured</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Signature */}
                    <div>
                      <SignatureButton
                        signature={employee.signature}
                        onSignatureChange={(signature) => updateEmployee(employee.id, { signature })}
                        signerName={employee.name}
                        readOnly={readOnly}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-center">
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWorker(employee.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {data.fieldEmployees.length > 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Total workers: {data.fieldEmployees.length} | 
            Working today: {data.fieldEmployees.filter(emp => emp.working).length} |
            Total hours: {data.fieldEmployees.reduce((total, emp) => total + (emp.working ? emp.hoursWorked : 0), 0)}
          </div>
        )}
      </div>

      {/* Add Worker Modal */}
      <Dialog open={isModalOpen && !readOnly} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Worker</DialogTitle>
            <DialogDescription>
              Select a contractor to add to todays workforce.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="contractorName">Name *</Label>
              {isLoadingAllContractors ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <Select value={modalData.name} onValueChange={(value) => setModalData({...modalData, name: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contractor">
                      {modalData.name && (() => {
                        const selectedContractor = allContractorsData?.contractors.find(
                          contractor => contractor.email === modalData.name
                        );
                        return selectedContractor ? `${selectedContractor.firstName} ${selectedContractor.lastName}` : modalData.name;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-48 overflow-y-auto">
                    {allContractorsData?.contractors.map((contractor) => (
                      <SelectItem 
                        key={contractor.id} 
                        value={contractor.email}
                      >
                        <div className="flex flex-col">
                          <span>{contractor.firstName} {contractor.lastName}</span>
                          <span className="text-xs text-gray-500">{contractor.email}</span>
                          {contractor.companyName && (
                            <span className="text-xs text-gray-400">
                              {contractor.companyName}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hoursWorked">Hours Worked</Label>
              <Select 
                value={modalData.hoursWorked.toString()} 
                onValueChange={(value) => setModalData({...modalData, hoursWorked: parseFloat(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-48 overflow-y-auto">
                  {hoursOptions.map((hours) => (
                    <SelectItem key={hours.value} value={hours.value.toString()}>
                      {hours.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Working</Label>
              <RadioGroup 
                value={modalData.working} 
                onValueChange={(value) => setModalData({...modalData, working: value})}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="working-yes" />
                  <Label htmlFor="working-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="working-no" />
                  <Label htmlFor="working-no">No</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddWorker} disabled={!modalData.name}>
              Add Worker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}