"use client";

import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useGetProjectsQuery } from '@/lib/features/projects/projectsApi';
import { useGetAdminUsersQuery } from '@/lib/features/admin-users/adminUsersApi';
import { useGetSubcontractorsQuery } from '@/lib/features/subcontractors/subcontractorsApi';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface EndOfDayV2FormData {
  completedBy: string;
  supervisor: string;
  projectName: string;
  subcontractorName: string;
  [key: string]: any;
}

interface ProjectDetailsStepProps {
  data: EndOfDayV2FormData;
  updateData: (updates: Partial<EndOfDayV2FormData>) => void;
}

export default function ProjectDetailsStep({ data, updateData }: ProjectDetailsStepProps) {
  const { t } = useTranslation('common');
  
  const { data: projectsData, isLoading: isLoadingProjects } = useGetProjectsQuery({
    page: 1,
    pageSize: 1000,
    authType: 'contractor',
    subcontractorName: data.subcontractorName || undefined
  });

  const { data: subcontractorsData } = useGetSubcontractorsQuery({
    page: 1,
    pageSize: 1000,
    authType: 'contractor'
  });

  const { data: adminUsersData, isLoading: isLoadingAdmins } = useGetAdminUsersQuery({
    fetchAll: true,
    authType: 'contractor'
  });

  // Projects are now filtered server-side based on subcontractorName
  const availableProjects = projectsData?.projects || [];
  const projectOptions = availableProjects.map(project => ({
    value: project.name,
    label: project.name
  }));

  const supervisorOptions = adminUsersData?.adminUsers.map(admin => ({
    value: admin.name,
    label: admin.name
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Project Details
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Completed By *</Label>
          <Input
            value={data.completedBy}
            onChange={(e) => updateData({ completedBy: e.target.value })}
            placeholder="Enter Name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Supervisor *</Label>
          <SearchableSelect
            options={supervisorOptions}
            value={data.supervisor}
            onValueChange={(value) => updateData({ supervisor: value })}
            placeholder="Select Supervisor"
            searchPlaceholder="Search supervisors..."
            emptyText={isLoadingAdmins ? "Loading..." : "No supervisors found"}
            disabled={isLoadingAdmins}
          />
        </div>

        <div className="space-y-2">
          <Label>Subcontractor</Label>
          <Input
            value={data.subcontractorName}
            disabled
            className="bg-gray-50 dark:bg-gray-800"
          />
        </div>

        <div className="space-y-2">
          <Label>Project Name *</Label>
          <SearchableSelect
            options={projectOptions}
            value={data.projectName}
            onValueChange={(value) => updateData({ projectName: value })}
            placeholder="Select Project Name"
            searchPlaceholder="Search projects..."
            emptyText={isLoadingProjects ? "Loading..." : "No projects found"}
            disabled={isLoadingProjects}
          />
        </div>
      </div>
    </div>
  );
}