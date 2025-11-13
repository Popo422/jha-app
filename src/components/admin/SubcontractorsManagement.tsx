"use client";

import React, { useState, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetSubcontractorsQuery, useDeleteSubcontractorMutation, type Subcontractor, type PaginationInfo } from "@/lib/features/subcontractors/subcontractorsApi";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Plus, ArrowUpDown, Building2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

export function SubcontractorsManagement() {
  const { t } = useTranslation('common');
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [clientPagination, setClientPagination] = useState({
    currentPage: 1,
    pageSize: 10
  });
  const [serverPagination, setServerPagination] = useState({
    page: 1,
    pageSize: 50
  });
  
  const { showToast } = useToast();
  
  const { data: subcontractorsData, isLoading, isFetching, refetch } = useGetSubcontractorsQuery({
    search: debouncedSearch || undefined,
    page: serverPagination.page,
    pageSize: serverPagination.pageSize,
    authType: 'admin'
  });
  
  
  const [deleteSubcontractor, { isLoading: isDeleting }] = useDeleteSubcontractorMutation();

  const allSubcontractors = subcontractorsData?.subcontractors || [];
  const serverPaginationInfo = subcontractorsData?.pagination;

  // Client-side pagination logic
  const startIndex = (clientPagination.currentPage - 1) * clientPagination.pageSize;
  const endIndex = startIndex + clientPagination.pageSize;
  const data = allSubcontractors.slice(startIndex, endIndex);
  
  // Create client pagination info
  const totalClientPages = Math.ceil(allSubcontractors.length / clientPagination.pageSize);
  
  // Calculate total pages considering both client view and server data
  const estimatedTotalRecords = serverPaginationInfo?.total || allSubcontractors.length;
  const estimatedTotalPages = Math.ceil(estimatedTotalRecords / clientPagination.pageSize);
  
  const paginationInfo = {
    page: clientPagination.currentPage,
    pageSize: clientPagination.pageSize,
    total: estimatedTotalRecords,
    totalPages: estimatedTotalPages,
    hasNextPage: clientPagination.currentPage < totalClientPages || (serverPaginationInfo?.hasNextPage || false),
    hasPreviousPage: clientPagination.currentPage > 1
  };

  // Check if we need to prefetch next batch
  const shouldPrefetch = clientPagination.currentPage >= totalClientPages - 2 && serverPaginationInfo?.hasNextPage;

  const handlePageChange = useCallback((page: number) => {
    const totalClientPages = Math.ceil(allSubcontractors.length / clientPagination.pageSize);
    
    if (page <= totalClientPages) {
      // Navigate within current batch
      setClientPagination(prev => ({ ...prev, currentPage: page }));
    } else {
      // Need to fetch next batch
      const nextServerPage = serverPagination.page + 1;
      setServerPagination(prev => ({ ...prev, page: nextServerPage }));
      setClientPagination({ currentPage: 1, pageSize: clientPagination.pageSize });
    }
  }, [allSubcontractors.length, clientPagination.pageSize, serverPagination.page]);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setClientPagination({ currentPage: 1, pageSize });
  }, []);

  // Prefetch next batch when near end
  const { data: prefetchData } = useGetSubcontractorsQuery({
    search: debouncedSearch || undefined,
    page: serverPagination.page + 1,
    pageSize: serverPagination.pageSize,
    authType: 'admin'
  }, {
    skip: !shouldPrefetch
  });

  const router = useRouter();
  
  const handleEdit = (subcontractor: Subcontractor) => {
    router.push(`/admin/subcontractors/${subcontractor.id}/edit?back=${encodeURIComponent('/admin/subcontractors')}`);
  };

  const handleAdd = () => {
    router.push('/admin/subcontractors/new?back=' + encodeURIComponent('/admin/subcontractors'));
  };



  const handleDelete = async (subcontractorId: string) => {
    const subcontractor = allSubcontractors.find(s => s.id === subcontractorId);
    if (!subcontractor) return;

    if (!confirm(`Are you sure you want to delete "${subcontractor.name}"?`)) {
      return;
    }

    try {
      await deleteSubcontractor(subcontractorId).unwrap();
      showToast('Subcontractor deleted successfully', 'success');
      refetch();
    } catch (error: any) {
      showToast(error.data?.error || 'Failed to delete subcontractor', 'error');
    }
  };

  // Define table columns
  const columns: ColumnDef<Subcontractor>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('contractors.companySubcontractor')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "contractAmount",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Contract Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const amount = row.getValue("contractAmount") as string | null;
        return amount ? `$${parseFloat(amount).toLocaleString()}` : "-";
      },
    },
    {
      accessorKey: "foreman",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Foreman
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const foreman = row.getValue("foreman") as string | null;
        return foreman ? (
          <span className="text-sm">{foreman}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "projectNames",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Projects
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const subcontractor = row.original;
        const projectNames = subcontractor.projectNames as string[] | null;
        
        if (projectNames && projectNames.length > 0) {
          const displayText = projectNames.join(', ');
          return (
            <div 
              className="text-sm max-w-[200px] truncate" 
              title={displayText}
            >
              {displayText}
            </div>
          );
        } else {
          return <span className="text-sm text-muted-foreground">No projects assigned</span>;
        }
      },
    },
    {
      accessorKey: "trade",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Trade
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const trade = row.getValue("trade") as string | null;
        return trade ? (
          <span className="text-sm">{trade}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "isUnion",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Union
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const isUnion = row.getValue("isUnion") as boolean;
        return (
          <div className="text-sm">
            {isUnion ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Yes
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                No
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "isSelfInsured",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          Self-Insured
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const isSelfInsured = row.getValue("isSelfInsured") as boolean;
        return (
          <div className="text-sm">
            {isSelfInsured ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Yes
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                No
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-sm"
        >
          {t('admin.created')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return date.toLocaleDateString();
      },
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Building2 className="mr-2 h-5 w-5" />
              {t('admin.subcontractorManagement')}
            </div>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.addSubcontractor')}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminDataTable
            data={data}
            columns={columns}
            isLoading={isLoading}
            isFetching={isFetching}
            onEdit={handleEdit}
            onDelete={handleDelete}
            getRowId={(subcontractor) => subcontractor.id}
            exportFilename="subcontractors"
            exportHeaders={[t('contractors.companySubcontractor'), 'Contract Amount', 'Foreman', 'Projects', 'Trade', 'Contractor License No.', 'Specialty License No.', 'Federal Tax ID', 'Motor Carrier Permit No.', 'Union', 'Self-Insured', 'Workers Comp Policy', t('admin.created')]}
            getExportData={(subcontractor) => [
              subcontractor.name,
              subcontractor.contractAmount ? `$${parseFloat(subcontractor.contractAmount).toLocaleString()}` : '',
              subcontractor.foreman || '',
              (subcontractor as any).projectNames?.join(', ') || 'No projects assigned',
              (subcontractor as any).trade || '',
              (subcontractor as any).contractorLicenseNo || '',
              (subcontractor as any).specialtyLicenseNo || '',
              (subcontractor as any).federalTaxId || '',
              (subcontractor as any).motorCarrierPermitNo || '',
              (subcontractor as any).isUnion ? 'Yes' : 'No',
              (subcontractor as any).isSelfInsured ? 'Yes' : 'No',
              (subcontractor as any).workersCompPolicy || '',
              new Date(subcontractor.createdAt).toLocaleDateString()
            ]}
            searchValue={search}
            onSearchChange={setSearch}
            serverSide={true}
            pagination={paginationInfo}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </CardContent>
      </Card>
    </>
  );
}