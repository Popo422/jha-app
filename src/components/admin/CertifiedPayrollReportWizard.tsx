"use client";

import React, { useState, useEffect, Fragment } from 'react';
import { Document, Page, Text, View, StyleSheet, PDFViewer, PDFDownloadLink, pdf } from '@react-pdf/renderer';
import { Skeleton } from '@/components/ui/skeleton';

// Types for the payroll data
interface PayrollWorker {
  id: string;
  name: string;
  address: string;
  ssn: string;
  driversLicense: string;
  ethnicity: string;
  gender: string;
  workClassification: string;
  location: string;
  type: string;
  dailyHours: {
    sunday: { straight: number; overtime: number; double: number };
    monday: { straight: number; overtime: number; double: number };
    tuesday: { straight: number; overtime: number; double: number };
    wednesday: { straight: number; overtime: number; double: number };
    thursday: { straight: number; overtime: number; double: number };
    friday: { straight: number; overtime: number; double: number };
    saturday: { straight: number; overtime: number; double: number };
  };
  totalHours: { straight: number; overtime: number; double: number };
  baseHourlyRate: number;
  overtimeRate: number;
  doubleTimeRate: number;
  grossAmount: number;
  deductions?: {
    federalTax: number;
    socialSecurity: number;
    medicare: number;
    stateTax: number;
    localTaxesSDI: number;
    voluntaryPension: number;
    voluntaryMedical: number;
    vacDues: number;
    travSubs: number;
    allOtherDeductions: number;
    totalDeduction: number;
  };
  fringes?: {
    rateInLieuOfFringes: number;
    totalBaseRatePlusFringes: number;
    hwRate: number;
    healthWelfare: number;
    pensionRate: number;
    pension: number;
    vacHolRate: number;
    vacationHoliday: number;
    trainingRate: number;
    training: number;
    allOtherRate: number;
    totalFringeRateToThird: number;
    totalFringesPaidToThird: number;
  };
  payments?: {
    checkNo: string;
    netPaidWeek: number;
    savings: number;
    payrollPaymentDate: string;
  };
  additionalInfo?: {
    fringesPaidToEmployee: string;
    vacationHolidayDuesInGrossPay: string;
    voluntaryContributionsInGrossPay: string;
    dateOfHire: string;
  };
}

interface PayrollWeekData {
  weekStart: string;
  weekEnd: string;
  workers: PayrollWorker[];
}

interface PayrollReportData {
  weekStart: string;
  weekEnd: string;
  projectName: string;
  workers: PayrollWorker[];
  weeks?: PayrollWeekData[]; // For multi-week reports
}

interface CertifiedPayrollReportProps {
  data: PayrollReportData | null;
  isLoading: boolean;
}

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 20,
    fontSize: 8,
  },
  header: {
    marginBottom: 10,
    textAlign: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  weekRange: {
    fontSize: 10,
    marginBottom: 10,
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#fff',
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#ccc',
  },
  headerRow: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#ccc',
    fontWeight: 'bold',
  },
  blankHeaderRow: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#ccc',
    width: '100%',
  },
  blankHeaderRowMiddle: {
    borderStyle: 'solid',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderColor: '#ccc',
    width: '100%',
  },
  contractorSeparator: {
    width: '100%',
    height: 50,
  },
  // Column widths
  nameCol: { width: '11%', padding: 2, borderRightWidth: 1, borderRightColor: '#ccc' },
  classificationCol: { width: '8%', padding: 2, borderRightWidth: 1, borderRightColor: '#ccc' },
  typeCol: { width: '1.5%', padding: 0, borderRightWidth: 1, borderRightColor: '#ccc', textAlign: 'center', flexDirection: 'column' },
  dayCell: { width: '4.2%', padding: 0, borderRightWidth: 1, borderRightColor: '#ccc', textAlign: 'center', flexDirection: 'column' },
  mergedDayHeader: { width: '29.45%', padding: 2, borderRightWidth: 1, borderRightColor: '#ccc', textAlign: 'center', justifyContent: 'center', alignItems: 'center' },
  dayCellRow: { 
    flex: 1, 
    borderBottomWidth: 1, 
    borderBottomColor: '#ccc', 
    padding: 1, 
    textAlign: 'center', 
    fontSize: 6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  mergedBlankRow: {
    flex: 2,
    borderBottomWidth: 1, 
    borderBottomColor: '#ccc', 
    padding: 2.7, 
    textAlign: 'center', 
    fontSize: 6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  totalCol: { width: '3.85%', padding: 0, borderRightWidth: 1, borderRightColor: '#ccc', flexDirection: 'column' },
  rateCol: { width: '3.85%', padding: 0, borderRightWidth: 1, borderRightColor: '#ccc', flexDirection: 'column' },
  amountCol: { width: '7.7%', padding: 0, borderRightWidth: 1, borderRightColor: '#ccc', flexDirection: 'row' },
  amountSubCol: { width: '50%', flexDirection: 'column', borderRightWidth: 1, borderRightColor: '#ccc' },
  amountSubColLast: { width: '50%', flexDirection: 'column' },
  deductionsCol: { width: '34.65%', padding: 0, flexDirection: 'column' },
  deductionRow: { flex: 1, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ccc' },
  deductionSubCol: { width: '11.11%', padding: 0.5, borderRightWidth: 1, borderRightColor: '#ccc', textAlign: 'center' },
  deductionSubColLast: { width: '11.12%', padding: 0.5, textAlign: 'center' },
  
  // Daily hours sub-table
  dailyHoursContainer: {
    flexDirection: 'column',
  },
  dailyHoursHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    fontSize: 6,
  },
  dayCol: { width: '13%', textAlign: 'center', padding: 1 },
  hoursTypeRow: {
    flexDirection: 'row',
    fontSize: 6,
  },
  hoursTypeLabel: { width: '9%', padding: 1, fontSize: 5 },
  hoursValue: { width: '13%', textAlign: 'center', padding: 1 },
  
  cellText: {
    fontSize: 6,
  },
  centerText: {
    textAlign: 'center',
  },
  rotatedText: {
    transform: 'rotate(-90deg)',
    fontSize: 6,
  },
});

// Helper function to get date for each day of the week
const getDateForDay = (weekStart: string, dayOffset: number) => {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + dayOffset);
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
};


// PDF Document Component  
export const PayrollPDFDocument = ({ data }: { data: PayrollReportData }) => (
  <Document title={`Certified_Payroll_${data.weekStart.replace(/-/g, '-')}_to_${data.weekEnd.replace(/-/g, '-')}.pdf`}>
    <Page size="A3" orientation="landscape" style={styles.page}>

      {/* Multi-week or single week rendering */}
      {data.weeks ? (
        // Multi-week report
        data.weeks.map((week, weekIndex) => (
          <Fragment key={`week-${weekIndex}`}>
            {/* New page for each week after the first */}
            {weekIndex > 0 && <View break />}
            
            {/* Week header */}
            <View style={[styles.header, { marginBottom: 5 }]}>
              <Text style={styles.title}>CERTIFIED PAYROLL</Text>
              <Text style={styles.weekRange}>
                Period: {week.weekStart} - {week.weekEnd}
              </Text>
              <Text>Project: {data.projectName}</Text>
            </View>

            {/* Tables - One per contractor for this week */}
            {week.workers.map((worker, index) => (
              <Fragment key={worker.id}>
                {/* Large spacing for contractors after the first one */}
                {index > 0 && <View style={styles.contractorSeparator}></View>}
          
          {/* Individual contractor table */}
          <View style={styles.table}>
            {/* Blank Header Rows - Only for first contractor */}
            {index === 0 && (
              <>
                {/* First blank row */}
                <View style={[styles.tableRow, { height:30 }]}>
                  <View style={{ width: '28%', padding: 2, borderColor: '#ccc', borderTopWidth: 1, borderBottomWidth: 1, borderRightWidth: 1, justifyContent: 'center', alignItems: 'flex-start' }}>
                    <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>NAME OF CONTRACTOR :</Text>
                    <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>Structure Re-Right, Inc</Text>
                    <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>Sub To: Brandenburg - Excavation</Text>
                    <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>Contract ID# 956405</Text>
                    <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>Subcontractor to Brandenburg - Excavation</Text>
                  </View>
                  <View style={{ width: '12.6%', padding: 2, borderColor: '#ccc', borderTopWidth: 1, borderBottomWidth: 1, justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                    <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>CONTRACTOR'S LICENSE No. 312-877-5560</Text>
                    <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>SPECIALTY LICENSE No.</Text>
                    <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>FEDERAL TAX ID#: 46-0886430</Text>
                  </View>
                  <View style={{ width: '29.4%', padding: 2, borderColor: '#ccc', borderTopWidth: 1, borderBottomWidth: 1, borderRightWidth: 1, justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                    <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>ADDRESS : 155 N. Michigan Ave Suite 300, Chicago, IL 60001</Text>
                    <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>PHONE: 312-662-2285</Text>
                    <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>EMAIL: giovanni@structurereright.com</Text>
                  </View>
                  <View style={{ width: '30%', padding: 2,  borderColor: '#ccc', borderTopWidth: 1,justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                    <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>PROJECT LOCATION/ CODE / NAME :</Text>
                    <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>Cook County, IL / TB074 / Bally's Chicago</Text>
                    <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>Permanent Facility (CCBC)</Text>
                  </View>
                </View>
                
                {/* Second blank row */}
                <View style={[styles.tableRow, { borderBottomWidth: 0, borderTopWidth: 0, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#ccc', height: 20 }]}>
                  <View style={{ width: '23.33%', padding: 2, borderRightWidth: 1, borderRightColor: '#ccc', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                    <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>PAYROLL No. 7</Text>
                  </View>
                  <View style={{ width: '11.67%', padding: 2, borderRightWidth: 1, borderRightColor: '#ccc', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                    <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>FOR WEEK ENDING: 11/23/2024</Text>
                    <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>SUBMITTED ON: December 01, 2024</Text>
                  </View>
                  <View style={{ width: '35%', padding: 2, borderRightWidth: 1, borderRightColor: '#ccc', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                    <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>MOTOR CARRIER PERMIT No</Text>
                    <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>SELF-INSURED CERTIFICATE No.</Text>
                    <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>WORKERS' COMP. POLICY :</Text>
                  </View>
                  <View style={{ width: '30%', padding: 2, borderTopWidth: 0, borderBottomWidth: 0, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={styles.cellText}></Text>
                  </View>
                </View>
              </>
            )}
            
            {/* Header Row - Only for first contractor */}
            {index === 0 && (
              <View style={[styles.tableRow, styles.headerRow]}>
                <View style={[styles.nameCol, { justifyContent: 'center', alignItems: 'center', width: '11%' }]}>
                  <Text style={[styles.cellText, { textAlign: 'center' }]}>Name, Address, SSN, Drivers License, Ethnicity, Gender</Text>
                </View>
                <View style={[styles.classificationCol, { justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={[styles.cellText, { textAlign: 'center' }]}>Work Classification, Location and Type</Text>
                </View>
                <View style={[styles.typeCol, { justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={[styles.cellText, { textAlign: 'center' }]}></Text>
                </View>
                <View style={styles.mergedDayHeader}>
                  <Text style={[styles.cellText, { textAlign: 'center' }]}>Hours Worked Each Day</Text>
                </View>
                <View style={[styles.totalCol, { justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={[styles.cellText, { textAlign: 'center' }]}>Total Hours</Text>
                </View>
                <View style={[styles.rateCol, { justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={[styles.cellText, { textAlign: 'center' }]}>Base Hourly Rate</Text>
                </View>
                <View style={[styles.amountCol, { justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }]}>
                  <Text style={[styles.cellText, { textAlign: 'center' }]}>Gross Amount Earned</Text>
                </View>
                <View style={[styles.deductionsCol, { justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={[styles.cellText, { textAlign: 'center' }]}>Deductions & Contributions</Text>
                </View>
              </View>
            )}
            
            {/* Contractor Data Row */}
            <View style={[styles.tableRow, { borderBottomWidth: 0 ,borderTopWidth: index === 0 ? 0 : 1 }]}>
            <View style={styles.nameCol}>
              <Text style={styles.cellText}>{worker.name}</Text>
              <Text style={styles.cellText}>{worker.address}</Text>
              <Text style={styles.cellText}>{worker.ssn}</Text>
              <Text style={styles.cellText}>{worker.driversLicense}</Text>
              <Text style={styles.cellText}>{worker.ethnicity}</Text>
              <Text style={styles.cellText}>{worker.gender}</Text>
            </View>

            <View style={styles.classificationCol}>
              <Text style={styles.cellText}>{worker.workClassification}</Text>
              <Text style={styles.cellText}>{worker.location}</Text>
              <Text style={styles.cellText}>Type: {worker.type}</Text>
            </View>

            <View style={styles.typeCol}>
              <View style={styles.mergedBlankRow}>
                <Text style={styles.cellText}></Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>S</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>O</Text>
              </View>
              <View style={[styles.dayCellRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.cellText}>D</Text>
              </View>
            </View>

            <View style={styles.dayCell}>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{getDateForDay(data.weekStart, 0)}</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>Sun</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{worker.dailyHours.sunday.straight || '0'}</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{worker.dailyHours.sunday.overtime || '0'}</Text>
              </View>
              <View style={[styles.dayCellRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.cellText}>{worker.dailyHours.sunday.double || '0'}</Text>
              </View>
            </View>

            <View style={styles.dayCell}>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{getDateForDay(data.weekStart, 1)}</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>Mon</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{worker.dailyHours.monday.straight || '0'}</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{worker.dailyHours.monday.overtime || '0'}</Text>
              </View>
              <View style={[styles.dayCellRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.cellText}>{worker.dailyHours.monday.double || '0'}</Text>
              </View>
            </View>

            <View style={styles.dayCell}>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{getDateForDay(data.weekStart, 2)}</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>Tue</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{worker.dailyHours.tuesday.straight || '0'}</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{worker.dailyHours.tuesday.overtime || '0'}</Text>
              </View>
              <View style={[styles.dayCellRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.cellText}>{worker.dailyHours.tuesday.double || '0'}</Text>
              </View>
            </View>

            <View style={styles.dayCell}>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{getDateForDay(data.weekStart, 3)}</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>Wed</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{worker.dailyHours.wednesday.straight || '0'}</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{worker.dailyHours.wednesday.overtime || '0'}</Text>
              </View>
              <View style={[styles.dayCellRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.cellText}>{worker.dailyHours.wednesday.double || '0'}</Text>
              </View>
            </View>

            <View style={styles.dayCell}>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{getDateForDay(data.weekStart, 4)}</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>Thu</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{worker.dailyHours.thursday.straight || '0'}</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{worker.dailyHours.thursday.overtime || '0'}</Text>
              </View>
              <View style={[styles.dayCellRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.cellText}>{worker.dailyHours.thursday.double || '0'}</Text>
              </View>
            </View>

            <View style={styles.dayCell}>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{getDateForDay(data.weekStart, 5)}</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>Fri</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{worker.dailyHours.friday.straight || '0'}</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{worker.dailyHours.friday.overtime || '0'}</Text>
              </View>
              <View style={[styles.dayCellRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.cellText}>{worker.dailyHours.friday.double || '0'}</Text>
              </View>
            </View>

            <View style={styles.dayCell}>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{getDateForDay(data.weekStart, 6)}</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>Sat</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{worker.dailyHours.saturday.straight || '0'}</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{worker.dailyHours.saturday.overtime || '0'}</Text>
              </View>
              <View style={[styles.dayCellRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.cellText}>{worker.dailyHours.saturday.double || '0'}</Text>
              </View>
            </View>

            <View style={styles.totalCol}>
              <View style={styles.mergedBlankRow}>
                <Text style={[styles.cellText,{ fontSize: 5 }]}>Total Hours on this Project</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{worker.totalHours.straight}</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>{worker.totalHours.overtime}</Text>
              </View>
              <View style={[styles.dayCellRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.cellText}>{worker.totalHours.double}</Text>
              </View>
            </View>

            <View style={styles.rateCol}>
              <View style={styles.mergedBlankRow}>
                <Text style={[styles.cellText,{ fontSize: 5 }]}>Base Hourly Rate of Pay</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>${worker.baseHourlyRate.toFixed(2)}</Text>
              </View>
              <View style={styles.dayCellRow}>
                <Text style={styles.cellText}>${worker.overtimeRate.toFixed(2)}</Text>
              </View>
              <View style={[styles.dayCellRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.cellText}>${worker.doubleTimeRate.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.amountCol}>
              <View style={styles.amountSubCol}>
                <View style={styles.mergedBlankRow}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>This Project</Text>
                </View>
                <View style={[styles.dayCellRow, { flex: 3.8, borderBottomWidth: 0 }]}>
                  <Text style={[styles.cellText, { textAlign: 'center' }]}>${worker.grossAmount.toFixed(2)}</Text>
                </View>
              </View>
              <View style={styles.amountSubColLast}>
                <View style={styles.mergedBlankRow}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>All Projects</Text>
                </View>
                <View style={[styles.dayCellRow, { flex: 3.8, borderBottomWidth: 0 }]}>
                  <Text style={[styles.cellText, { textAlign: 'center' }]}>${worker.grossAmount.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.deductionsCol}>
              {/* Row 1: Headers */}
              <View style={styles.deductionRow}>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>Fed Tax</Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>Soc Sec</Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>Medicare</Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>State Tax</Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>Local/SDI</Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>Other</Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>Savings</Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>Tot Ded</Text>
                </View>
                <View style={styles.deductionSubColLast}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>Check No</Text>
                </View>
              </View>
              {/* Row 2: Values */}
              <View style={styles.deductionRow}>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>
                    ${(worker.deductions?.federalTax || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>
                    ${(worker.deductions?.socialSecurity || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>
                    ${(worker.deductions?.medicare || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>
                    ${(worker.deductions?.stateTax || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>
                    ${(worker.deductions?.localTaxesSDI || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>
                    ${(worker.deductions?.allOtherDeductions || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>
                    ${(worker.payments?.savings || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>
                    ${(worker.deductions?.totalDeduction || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.deductionSubColLast}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>
                    {worker.payments?.checkNo || 'N/A'}
                  </Text>
                </View>
              </View>
              {/* Row 3: Fringe Headers */}
              <View style={styles.deductionRow}>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>Vac/Dues</Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>Trav Subs</Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>Health</Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>Pension</Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>Vac Hol</Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>Training</Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>All Other</Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>Tot Fringe</Text>
                </View>
                <View style={styles.deductionSubColLast}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>Paid 3rd</Text>
                </View>
              </View>
              {/* Row 4: Fringe Values */}
              <View style={[styles.deductionRow, { borderBottomWidth: 0 }]}>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>
                    ${(worker.deductions?.vacDues || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>
                    ${(worker.deductions?.travSubs || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>
                    ${(worker.fringes?.healthWelfare || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>
                    ${(worker.fringes?.pension || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>
                    ${(worker.fringes?.vacationHoliday || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>
                    ${(worker.fringes?.training || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>
                    ${(worker.fringes?.totalFringesPaidToThird || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.deductionSubCol}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>
                    ${((worker.fringes?.healthWelfare || 0) + (worker.fringes?.pension || 0) + (worker.fringes?.training || 0) + (worker.fringes?.vacationHoliday || 0)).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.deductionSubColLast}>
                  <Text style={[styles.cellText, { textAlign: 'center', fontSize: 5 }]}>
                    ${(worker.payments?.netPaidWeek || 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
            </View>

            {/* Additional Row */}
            <View style={[styles.tableRow, { borderBottomWidth: 0,borderLeftColor: "white", height: 12 }]}>
              <View style={[styles.nameCol, { borderTopWidth: 1, borderTopColor: '#ccc', borderRightWidth: 0 }]}>
                <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>
                  Date of Hire: {worker.additionalInfo?.dateOfHire || '10/7/2024'}
                </Text>
              </View>
              <View style={[styles.classificationCol, { borderTopWidth: 1, borderTopColor: '#ccc', borderRightWidth: 0 ,width: '9.5%'}]}>
                <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>
                  All or Part of Fringes Paid to Employee: {worker.additionalInfo?.fringesPaidToEmployee || 'NO'}
                </Text>
              </View>
              {/* <View style={[styles.typeCol, { borderTopWidth: 1, borderTopColor: '#ccc', borderRightWidth: 0 }]}>
                <Text style={[styles.cellText, { fontSize: 5 }]}></Text>
              </View> */}
              <View style={[styles.mergedDayHeader, { borderTopWidth: 1, borderTopColor: '#ccc',textAlign: 'left' }]}>
                <Text style={[styles.cellText, { fontSize: 5,  textAlign: 'left'}]}>
                  * Vacation, Holiday and Dues in Gross Pay: {worker.additionalInfo?.vacationHolidayDuesInGrossPay || 'YES'}
                </Text>
              </View>
              <View style={[styles.totalCol, { borderTopWidth: 1, borderTopColor: '#ccc' }]}>
                <Text style={[styles.cellText, { fontSize: 5 }]}></Text>
              </View>
              <View style={[styles.rateCol, { borderTopWidth: 1, borderTopColor: '#ccc', }]}>
                <Text style={[styles.cellText, { fontSize: 5, textAlign: 'center' }]}>Rate in Lieu of Fringes</Text>
              </View>
              <View style={[styles.amountCol, { borderTopWidth: 1, borderTopColor: '#ccc' }]}>
                <View style={styles.amountSubCol}>
                  <Text style={[styles.cellText, { fontSize: 5 ,textAlign: 'center'}]}>Total in Lieu of Fringes</Text>
                </View>
                <View style={styles.amountSubColLast}>
                  <Text style={[styles.cellText, { fontSize: 5,textAlign: 'center' }]}>Total Base Rate + Fringes</Text>
                </View>
              </View>
              <View style={[styles.deductionsCol, { borderTopWidth: 1, borderTopColor: '#ccc' }]}>
                <View style={[styles.deductionRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.deductionSubCol}>
                    <Text style={[styles.cellText, { fontSize: 5 }]}>Voluntary Pension</Text>
                  </View>
                  <View style={styles.deductionSubCol}>
                    <Text style={[styles.cellText, { fontSize: 5 }]}>Voluntary Medical</Text>
                  </View>
                  <View style={styles.deductionSubCol}>
                    <Text style={[styles.cellText, { fontSize: 5 }]}>H&W Rate</Text>
                  </View>
                  <View style={styles.deductionSubCol}>
                    <Text style={[styles.cellText, { fontSize: 5 }]}>Pension Rate</Text>
                  </View>
                  <View style={styles.deductionSubCol}>
                    <Text style={[styles.cellText, { fontSize: 5 }]}>Vac/Hol Rate</Text>
                  </View>
                  <View style={styles.deductionSubCol}>
                    <Text style={[styles.cellText, { fontSize: 5 }]}>Training Rate</Text>
                  </View>
                  <View style={styles.deductionSubCol}>
                    <Text style={[styles.cellText, { fontSize: 5 }]}>All Other Rate</Text>
                  </View>
                  <View style={styles.deductionSubCol}>
                    <Text style={[styles.cellText, { fontSize: 5 }]}>Total Fringe Rate to 3rd</Text>
                  </View>
                  <View style={styles.deductionSubColLast}>
                    <Text style={[styles.cellText, { fontSize: 5 }]}>Payroll Payment Date</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Additional Row 2 */}
            <View style={[styles.tableRow, { borderBottomWidth: 0,borderLeftColor: "white", height: 12 }]}>
              <View style={[styles.nameCol, { borderTopWidth: 0, borderRightWidth: 0 }]}>
                <Text style={[styles.cellText, { fontSize: 5 }]}></Text>
              </View>
              <View style={[styles.classificationCol, { borderTopWidth: 0, borderRightWidth: 0 }]}>
                <Text style={[styles.cellText, { fontSize: 5 }]}></Text>
              </View>
              <View style={[styles.typeCol, { borderTopWidth: 0, borderRightWidth: 0 }]}>
                <Text style={[styles.cellText, { fontSize: 5 }]}></Text>
              </View>
              <View style={[styles.mergedDayHeader, { borderTopWidth: 0, textAlign: 'left' }]}>
                <Text style={[styles.cellText, { fontSize: 5, textAlign: 'left' }]}>
                  Voluntary Contributions in Gross Pay: {worker.additionalInfo?.voluntaryContributionsInGrossPay || 'NO'}
                </Text>
              </View>
              <View style={[styles.totalCol, { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#ccc' }]}>
                <Text style={[styles.cellText, { fontSize: 5 }]}></Text>
              </View>
              <View style={[styles.rateCol, { borderTopWidth: 1,borderBottomWidth: 1, borderColor: '#ccc' }]}>
                <Text style={[styles.cellText, { fontSize: 5, textAlign: 'center' }]}>
                  ${(worker.fringes?.rateInLieuOfFringes || 0).toFixed(2)}
                </Text>
              </View>
              <View style={[styles.amountCol, { borderTopWidth: 1,borderBottomWidth: 1, borderColor: '#ccc' }]}>
                <View style={styles.amountSubCol}>
                  <Text style={[styles.cellText, { fontSize: 5, textAlign: 'center' }]}>
                    ${(worker.fringes?.rateInLieuOfFringes || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.amountSubColLast}>
                  <Text style={[styles.cellText, { fontSize: 5, textAlign: 'center' }]}>
                    ${(worker.fringes?.totalBaseRatePlusFringes || 0).toFixed(2)}
                  </Text>
                </View>
              </View>
              <View style={[styles.deductionsCol, { borderTopWidth: 1,borderBottomWidth: 1, borderColor: '#ccc' }]}>
                <View style={[styles.deductionRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.deductionSubCol}>
                    <Text style={[styles.cellText, { fontSize: 5 }]}>
                      ${(worker.deductions?.voluntaryPension || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.deductionSubCol}>
                    <Text style={[styles.cellText, { fontSize: 5 }]}>
                      ${(worker.deductions?.voluntaryMedical || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.deductionSubCol}>
                    <Text style={[styles.cellText, { fontSize: 5 }]}>
                      ${(worker.fringes?.hwRate || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.deductionSubCol}>
                    <Text style={[styles.cellText, { fontSize: 5 }]}>
                      ${(worker.fringes?.pensionRate || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.deductionSubCol}>
                    <Text style={[styles.cellText, { fontSize: 5 }]}>
                      ${(worker.fringes?.vacHolRate || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.deductionSubCol}>
                    <Text style={[styles.cellText, { fontSize: 5 }]}>
                      ${(worker.fringes?.trainingRate || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.deductionSubCol}>
                    <Text style={[styles.cellText, { fontSize: 5 }]}>
                      ${(worker.fringes?.allOtherRate || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.deductionSubCol}>
                    <Text style={[styles.cellText, { fontSize: 5 }]}>
                      ${(worker.fringes?.totalFringeRateToThird || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.deductionSubColLast}>
                    <Text style={[styles.cellText, { fontSize: 5 }]}>
                      {worker.payments?.payrollPaymentDate || 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
          </Fragment>
            ))}
          </Fragment>
        ))
      ) : (
        // Single week report (fallback to existing logic)
        data.workers.map((worker, index) => (
          <Fragment key={worker.id}>
            {/* Large spacing for contractors after the first one */}
            {index > 0 && <View style={styles.contractorSeparator}></View>}
            
            {/* Individual contractor table */}
            <View style={styles.table}>
              {/* Header Row - Only for first contractor */}
              {index === 0 && (
                <View style={[styles.tableRow, styles.headerRow]}>
                  <View style={[styles.nameCol, { justifyContent: 'center', alignItems: 'center', width: '11%' }]}>
                    <Text style={[styles.cellText, { textAlign: 'center' }]}>Name, Address, SSN, Drivers License, Ethnicity, Gender</Text>
                  </View>
                  <View style={[styles.classificationCol, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={[styles.cellText, { textAlign: 'center' }]}>Work Classification, Location and Type</Text>
                  </View>
                  <View style={[styles.typeCol, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={[styles.cellText, { textAlign: 'center' }]}></Text>
                  </View>
                  <View style={styles.mergedDayHeader}>
                    <Text style={[styles.cellText, { textAlign: 'center' }]}>Hours Worked Each Day</Text>
                  </View>
                  <View style={[styles.totalCol, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={[styles.cellText, { textAlign: 'center' }]}>Total Hours</Text>
                  </View>
                  <View style={[styles.rateCol, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={[styles.cellText, { textAlign: 'center' }]}>Base Hourly Rate</Text>
                  </View>
                  <View style={[styles.amountCol, { justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }]}>
                    <Text style={[styles.cellText, { textAlign: 'center' }]}>Gross Amount Earned</Text>
                  </View>
                  <View style={[styles.deductionsCol, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={[styles.cellText, { textAlign: 'center' }]}>Deductions & Contributions</Text>
                  </View>
                </View>
              )}
              
              {/* Single week contractor data would go here - truncated for brevity */}
            </View>
          </Fragment>
        ))
      )}
    </Page>
  </Document>
);

export default function CertifiedPayrollReport({ data, isLoading }: CertifiedPayrollReportProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (data) {
      setGenerating(true);
      const generatePdfUrl = async () => {
        try {
          const blob = await pdf(<PayrollPDFDocument data={data} />).toBlob();
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        } catch (error) {
          console.error('Error generating PDF:', error);
        } finally {
          setGenerating(false);
        }
      };
      generatePdfUrl();
    }
  }, [data]);

  // Cleanup URL when component unmounts
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  if (isLoading || generating) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!data || (data.workers.length === 0 && (!data.weeks || data.weeks.length === 0 || data.weeks.every(week => week.workers.length === 0)))) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <h4 className="text-xl font-medium text-gray-600 dark:text-gray-300">
            No Workers Found
          </h4>
          <p className="text-gray-500 dark:text-gray-400">
            No contractors have worked on this project yet.
          </p>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="h-[600px] w-full flex items-center justify-center">
        <div className="text-gray-500">Failed to generate PDF</div>
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full">
      <div style={{ 
        width: '100%', 
        height: '100%', 
        background: 'white',
        overflow: 'hidden'
      }}>
        <PDFViewer 
          width="100%" 
          height="100%" 
          showToolbar={true}
          style={{ 
            border: 'none',
            backgroundColor: 'white'
          }}
        >
          <PayrollPDFDocument data={data} />
        </PDFViewer>
      </div>
    </div>
  );
}