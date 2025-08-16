import { useCallback } from 'react';
import { useLazyGetTimesheetsQuery } from '@/lib/features/timesheets/timesheetsApi';
import { useLazyGetSubmissionsQuery } from '@/lib/features/submissions/submissionsApi';
import { useLazyGetContractorsQuery } from '@/lib/features/contractors/contractorsApi';
import { useLazyGetToolboxTalksQuery } from '@/lib/features/toolbox-talks/toolboxTalksApi';
import { useLazyGetAdminUsersQuery } from '@/lib/features/admin-users/adminUsersApi';
import { useLazyGetProjectSnapshotQuery } from '@/lib/features/project-snapshot/projectSnapshotApi';

interface TimesheetExportParams {
  dateFrom?: string;
  dateTo?: string;
  company?: string;
  search?: string;
  status?: string;
  jobName?: string;
  employees?: string;
  authType?: 'contractor' | 'admin' | 'any';
}

interface SubmissionExportParams {
  type?: string;
  excludeTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
  company?: string;
  search?: string;
  authType?: 'contractor' | 'admin' | 'any';
}

export function useTimesheetExportAll() {
  const [fetchAllTimesheets] = useLazyGetTimesheetsQuery();

  return useCallback(async (params: TimesheetExportParams) => {
    const result = await fetchAllTimesheets({
      ...params,
      fetchAll: true,
    });

    if (result.data) {
      return result.data.timesheets;
    } else {
      throw new Error('Failed to fetch all timesheets for export');
    }
  }, [fetchAllTimesheets]);
}

export function useSubmissionExportAll() {
  const [fetchAllSubmissions] = useLazyGetSubmissionsQuery();

  return useCallback(async (params: SubmissionExportParams) => {
    const result = await fetchAllSubmissions({
      ...params,
      fetchAll: true,
    });

    if (result.data) {
      return result.data.submissions;
    } else {
      throw new Error('Failed to fetch all submissions for export');
    }
  }, [fetchAllSubmissions]);
}

export function useContractorExportAll() {
  const [fetchAllContractors] = useLazyGetContractorsQuery();

  return useCallback(async (params: any = {}) => {
    const result = await fetchAllContractors({
      ...params,
      fetchAll: true,
    });

    if (result.data) {
      return result.data.contractors;
    } else {
      throw new Error('Failed to fetch all contractors for export');
    }
  }, [fetchAllContractors]);
}

export function useToolboxTalkExportAll() {
  const [fetchAllToolboxTalks] = useLazyGetToolboxTalksQuery();

  return useCallback(async (params: any = {}) => {
    const result = await fetchAllToolboxTalks({
      ...params,
      fetchAll: true,
    });

    if (result.data) {
      return result.data.toolboxTalks;
    } else {
      throw new Error('Failed to fetch all toolbox talks for export');
    }
  }, [fetchAllToolboxTalks]);
}

export function useAdminUserExportAll() {
  const [fetchAllAdminUsers] = useLazyGetAdminUsersQuery();

  return useCallback(async (params: any = {}) => {
    const result = await fetchAllAdminUsers({
      ...params,
      fetchAll: true,
    });

    if (result.data) {
      return result.data.adminUsers;
    } else {
      throw new Error('Failed to fetch all admin users for export');
    }
  }, [fetchAllAdminUsers]);
}

export function useProjectSnapshotExportAll() {
  const [fetchAllProjectSnapshot] = useLazyGetProjectSnapshotQuery();

  return useCallback(async (params: any = {}) => {
    const result = await fetchAllProjectSnapshot({
      ...params,
      fetchAll: true,
    });

    if (result.data) {
      return result.data.projects;
    } else {
      throw new Error('Failed to fetch all project snapshot data for export');
    }
  }, [fetchAllProjectSnapshot]);
}