"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';

interface PayrollDetailsFormProps {
  contractorName: string;
  contractorId: string;
  dateRange: { startDate: string; endDate: string };
  initialData?: PayrollFormData | null;
  onBack: () => void;
  onSave: (payrollData: PayrollFormData) => void;
}

interface PayrollFormData {
  // Deductions
  federalTax: string;
  socialSecurity: string;
  medicare: string;
  stateTax: string;
  localTaxesSDI: string;
  voluntaryPension: string;
  voluntaryMedical: string;
  vacDues: string;
  travSubs: string;
  allOtherDeductions: string;
  totalDeduction: string;
  
  // Rates and Fringes
  rateInLieuOfFringes: string;
  totalBaseRatePlusFringes: string;
  hwRate: string;
  healthWelfare: string;
  pensionRate: string;
  pension: string;
  vacHolRate: string;
  vacationHoliday: string;
  trainingRate: string;
  allOtherFringes: string;
  allOtherRate: string;
  totalFringeRateToThird: string;
  totalFringesPaidToThird: string;
  
  // Payment Details
  checkNo: string;
  netPaidWeek: string;
  payrollPaymentDate: string;
  savings: string;
  
  // Additional Info (Yes/No dropdowns)
  allOrPartOfFringesPaidToEmployee: 'yes' | 'no' | '';
  vacationHolidayDuesInGrossPay: 'yes' | 'no' | '';
  voluntaryContributionsInGrossPay: 'yes' | 'no' | '';
}

export default function PayrollDetailsForm({ 
  contractorName,
  contractorId,
  dateRange,
  initialData,
  onBack,
  onSave
}: PayrollDetailsFormProps) {
  const defaultFormData: PayrollFormData = {
    federalTax: '',
    socialSecurity: '',
    medicare: '',
    stateTax: '',
    localTaxesSDI: '',
    voluntaryPension: '',
    voluntaryMedical: '',
    vacDues: '',
    travSubs: '',
    allOtherDeductions: '',
    totalDeduction: '',
    rateInLieuOfFringes: '',
    totalBaseRatePlusFringes: '',
    hwRate: '',
    healthWelfare: '',
    pensionRate: '',
    pension: '',
    vacHolRate: '',
    vacationHoliday: '',
    trainingRate: '',
    allOtherFringes: '',
    allOtherRate: '',
    totalFringeRateToThird: '',
    totalFringesPaidToThird: '',
    checkNo: '',
    netPaidWeek: '',
    payrollPaymentDate: '',
    savings: '',
    allOrPartOfFringesPaidToEmployee: '',
    vacationHolidayDuesInGrossPay: '',
    voluntaryContributionsInGrossPay: '',
  };

  const [formData, setFormData] = useState<PayrollFormData>(
    initialData || defaultFormData
  );

  const formatDateRange = () => {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    
    return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}`;
  };

  const handleInputChange = (field: keyof PayrollFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={onBack}
              className="text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Payroll Options
            </Button>
            
            <div className="text-right">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Add Payroll Details
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Employee: {contractorName} | Pay Period: {formatDateRange()}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column 1: Deductions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Deductions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="federalTax">Federal Tax</Label>
                  <Input
                    id="federalTax"
                    type="number"
                    step="0.01"
                    value={formData.federalTax}
                    onChange={(e) => handleInputChange('federalTax', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="socialSecurity">Social Security</Label>
                  <Input
                    id="socialSecurity"
                    type="number"
                    step="0.01"
                    value={formData.socialSecurity}
                    onChange={(e) => handleInputChange('socialSecurity', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medicare">Medicare</Label>
                  <Input
                    id="medicare"
                    type="number"
                    step="0.01"
                    value={formData.medicare}
                    onChange={(e) => handleInputChange('medicare', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stateTax">State Tax</Label>
                  <Input
                    id="stateTax"
                    type="number"
                    step="0.01"
                    value={formData.stateTax}
                    onChange={(e) => handleInputChange('stateTax', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="localTaxesSDI">Local Taxes / SDI</Label>
                  <Input
                    id="localTaxesSDI"
                    type="number"
                    step="0.01"
                    value={formData.localTaxesSDI}
                    onChange={(e) => handleInputChange('localTaxesSDI', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voluntaryPension">Voluntary Pension</Label>
                  <Input
                    id="voluntaryPension"
                    type="number"
                    step="0.01"
                    value={formData.voluntaryPension}
                    onChange={(e) => handleInputChange('voluntaryPension', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voluntaryMedical">Voluntary Medical</Label>
                  <Input
                    id="voluntaryMedical"
                    type="number"
                    step="0.01"
                    value={formData.voluntaryMedical}
                    onChange={(e) => handleInputChange('voluntaryMedical', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vacDues">Vac/Dues</Label>
                  <Input
                    id="vacDues"
                    type="number"
                    step="0.01"
                    value={formData.vacDues}
                    onChange={(e) => handleInputChange('vacDues', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="travSubs">Trav Subs</Label>
                  <Input
                    id="travSubs"
                    type="number"
                    step="0.01"
                    value={formData.travSubs}
                    onChange={(e) => handleInputChange('travSubs', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allOtherDeductions">All Other</Label>
                  <Input
                    id="allOtherDeductions"
                    type="number"
                    step="0.01"
                    value={formData.allOtherDeductions}
                    onChange={(e) => handleInputChange('allOtherDeductions', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="totalDeduction" className="font-semibold">Total Deduction</Label>
                  <Input
                    id="totalDeduction"
                    type="number"
                    step="0.01"
                    value={formData.totalDeduction}
                    onChange={(e) => handleInputChange('totalDeduction', e.target.value)}
                    placeholder="0.00"
                    className="font-semibold bg-gray-50 dark:bg-gray-800"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Column 2: Rates & Fringes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Rates & Fringes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rateInLieuOfFringes">Rate in Lieu of Fringes</Label>
                  <Input
                    id="rateInLieuOfFringes"
                    type="number"
                    step="0.01"
                    value={formData.rateInLieuOfFringes}
                    onChange={(e) => handleInputChange('rateInLieuOfFringes', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalBaseRatePlusFringes">Total Base Rate + Fringes</Label>
                  <Input
                    id="totalBaseRatePlusFringes"
                    type="number"
                    step="0.01"
                    value={formData.totalBaseRatePlusFringes}
                    onChange={(e) => handleInputChange('totalBaseRatePlusFringes', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hwRate">H&W Rate</Label>
                  <Input
                    id="hwRate"
                    type="number"
                    step="0.01"
                    value={formData.hwRate}
                    onChange={(e) => handleInputChange('hwRate', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="healthWelfare">Health & Welfare</Label>
                  <Input
                    id="healthWelfare"
                    type="number"
                    step="0.01"
                    value={formData.healthWelfare}
                    onChange={(e) => handleInputChange('healthWelfare', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pensionRate">Pension Rate</Label>
                  <Input
                    id="pensionRate"
                    type="number"
                    step="0.01"
                    value={formData.pensionRate}
                    onChange={(e) => handleInputChange('pensionRate', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pension">Pension</Label>
                  <Input
                    id="pension"
                    type="number"
                    step="0.01"
                    value={formData.pension}
                    onChange={(e) => handleInputChange('pension', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vacHolRate">Vac Hol Rate</Label>
                  <Input
                    id="vacHolRate"
                    type="number"
                    step="0.01"
                    value={formData.vacHolRate}
                    onChange={(e) => handleInputChange('vacHolRate', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vacationHoliday">Vacation Holiday</Label>
                  <Input
                    id="vacationHoliday"
                    type="number"
                    step="0.01"
                    value={formData.vacationHoliday}
                    onChange={(e) => handleInputChange('vacationHoliday', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trainingRate">Training Rate</Label>
                  <Input
                    id="trainingRate"
                    type="number"
                    step="0.01"
                    value={formData.trainingRate}
                    onChange={(e) => handleInputChange('trainingRate', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allOtherFringes">All Other</Label>
                  <Input
                    id="allOtherFringes"
                    type="number"
                    step="0.01"
                    value={formData.allOtherFringes}
                    onChange={(e) => handleInputChange('allOtherFringes', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allOtherRate">All Other Rate</Label>
                  <Input
                    id="allOtherRate"
                    type="number"
                    step="0.01"
                    value={formData.allOtherRate}
                    onChange={(e) => handleInputChange('allOtherRate', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="totalFringeRateToThird" className="font-semibold">Total Fringe Rate to 3rd</Label>
                  <Input
                    id="totalFringeRateToThird"
                    type="number"
                    step="0.01"
                    value={formData.totalFringeRateToThird}
                    onChange={(e) => handleInputChange('totalFringeRateToThird', e.target.value)}
                    placeholder="0.00"
                    className="font-semibold bg-gray-50 dark:bg-gray-800"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalFringesPaidToThird" className="font-semibold">Total Fringes Paid to 3rd</Label>
                  <Input
                    id="totalFringesPaidToThird"
                    type="number"
                    step="0.01"
                    value={formData.totalFringesPaidToThird}
                    onChange={(e) => handleInputChange('totalFringesPaidToThird', e.target.value)}
                    placeholder="0.00"
                    className="font-semibold bg-gray-50 dark:bg-gray-800"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Column 3: Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="checkNo">Check No.</Label>
                  <Input
                    id="checkNo"
                    value={formData.checkNo}
                    onChange={(e) => handleInputChange('checkNo', e.target.value)}
                    placeholder="Check number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="netPaidWeek">Net Paid Week</Label>
                  <Input
                    id="netPaidWeek"
                    type="number"
                    step="0.01"
                    value={formData.netPaidWeek}
                    onChange={(e) => handleInputChange('netPaidWeek', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="savings">Savings</Label>
                  <Input
                    id="savings"
                    type="number"
                    step="0.01"
                    value={formData.savings}
                    onChange={(e) => handleInputChange('savings', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payrollPaymentDate">Payroll Payment Date</Label>
                  <Input
                    id="payrollPaymentDate"
                    type="date"
                    value={formData.payrollPaymentDate}
                    onChange={(e) => handleInputChange('payrollPaymentDate', e.target.value)}
                  />
                </div>

                {/* Additional Information Section */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Additional Information</h4>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="allOrPartOfFringesPaidToEmployee">All or Part of Fringes Paid to Employee:</Label>
                      <Select
                        value={formData.allOrPartOfFringesPaidToEmployee}
                        onValueChange={(value: 'yes' | 'no') => handleInputChange('allOrPartOfFringesPaidToEmployee', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Yes or No" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vacationHolidayDuesInGrossPay">Vacation, Holiday and Dues in Gross Pay:</Label>
                      <Select
                        value={formData.vacationHolidayDuesInGrossPay}
                        onValueChange={(value: 'yes' | 'no') => handleInputChange('vacationHolidayDuesInGrossPay', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Yes or No" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="voluntaryContributionsInGrossPay">Voluntary Contributions in Gross Pay:</Label>
                      <Select
                        value={formData.voluntaryContributionsInGrossPay}
                        onValueChange={(value: 'yes' | 'no') => handleInputChange('voluntaryContributionsInGrossPay', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Yes or No" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6">
            <Button 
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 text-white px-8"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Payroll Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}