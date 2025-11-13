"use client";

import { useState, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Plus, DollarSign, Calendar, Clock, FileText, User, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { 
  useGetChangeOrdersQuery, 
  useDeleteChangeOrderMutation,
  type ChangeOrder 
} from "@/lib/features/change-orders/changeOrdersApi";
import { useToast } from "@/components/ui/toast";

interface ProjectChangeOrdersProps {
  projectId: string;
}

export default function ProjectChangeOrders({ projectId }: ProjectChangeOrdersProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");

  const { toast, showToast } = useToast();

  // API hooks
  const { data: changeOrdersData, isLoading, isFetching, refetch } = useGetChangeOrdersQuery(
    { projectId },
    { skip: !projectId }
  );
  
  const [deleteChangeOrder] = useDeleteChangeOrderMutation();

  const changeOrders = changeOrdersData?.changeOrders || [];

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return '-';
    }
  };

  // Format currency helper
  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'Pending':
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    }
  };

  // Get change type color
  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'Cost':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Time':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'Scope':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'All':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Table columns
  const columns: ColumnDef<ChangeOrder>[] = useMemo(() => [
    {
      header: "Title",
      accessorKey: "title",
      cell: ({ row }) => (
        <div className="font-medium max-w-xs truncate" title={row.original.title}>
          {row.original.title}
        </div>
      ),
    },
    {
      header: "Change Type",
      accessorKey: "changeType",
      cell: ({ row }) => (
        <Badge variant="outline" className={getChangeTypeColor(row.original.changeType)}>
          {row.original.changeType}
        </Badge>
      ),
    },
    {
      header: "Cost Impact",
      accessorKey: "costDifference",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-4 w-4 text-gray-500" />
          {formatCurrency(row.original.costDifference)}
        </div>
      ),
    },
    {
      header: "Schedule Impact",
      accessorKey: "addedDays",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-gray-500" />
          {row.original.addedDays > 0 ? `+${row.original.addedDays} days` : '0 days'}
        </div>
      ),
    },
    {
      header: "Requested By",
      accessorKey: "requestedBy",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <User className="h-4 w-4 text-gray-500" />
          <span className="text-sm">{row.original.requestedBy}</span>
        </div>
      ),
    },
    {
      header: "Submission Date",
      accessorKey: "submissionDate",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4 text-gray-500" />
          {formatDate(row.original.submissionDate)}
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => {
        const status = row.original.status;
        const IconComponent = 
          status === 'Approved' ? CheckCircle : 
          status === 'Rejected' ? XCircle : AlertCircle;
        
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getStatusColor(status)}>
              <IconComponent className="h-3 w-3 mr-1" />
              {status}
            </Badge>
          </div>
        );
      },
    },
    {
      header: "Approver",
      accessorKey: "toBeApprovedBy",
      cell: ({ row }) => (
        <div className="text-sm text-gray-600 max-w-xs truncate" title={row.original.toBeApprovedBy || 'Not assigned'}>
          {row.original.toBeApprovedBy || 'Not assigned'}
        </div>
      ),
    },
  ], []);

  // Handle edit
  const handleEdit = (changeOrder: ChangeOrder) => {
    router.push(`/admin/change-orders/${changeOrder.id}/edit`);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteChangeOrder(id).unwrap();
      showToast("Change order deleted successfully", "success");
    } catch (error: any) {
      showToast(error?.data?.error || "Failed to delete change order", "error");
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async (ids: string[]) => {
    if (ids.length === 0) return;

    try {
      // Delete all change orders in parallel
      await Promise.all(ids.map(id => deleteChangeOrder(id).unwrap()));
      showToast(`${ids.length} change order(s) deleted successfully`, "success");
    } catch (error: any) {
      showToast(error?.data?.error || "Failed to delete change orders", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Change Orders</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage project change orders and approval workflow
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            className="flex items-center gap-2"
            onClick={() => router.push(`/admin/change-orders/new?projectId=${projectId}`)}
          >
            <Plus className="h-4 w-4" />
            New Change Order
          </Button>
        </div>
      </div>

      <AdminDataTable
        data={changeOrders}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        getRowId={(changeOrder) => changeOrder.id}
        exportFilename="change-orders"
        exportHeaders={[
          "Title",
          "Description", 
          "Change Type",
          "Original Contract Amount",
          "New Amount",
          "Cost Difference",
          "Added Days",
          "Original End Date",
          "Revised End Date",
          "Requested By",
          "Submission Date",
          "Notes/Justification",
          "To Be Approved By",
          "Key Stakeholder",
          "Status",
          "Approver Signature",
          "Date Approved",
          "Date Rejected",
          "Rejection Reason",
          "Created At",
          "Updated At"
        ]}
        getExportData={(changeOrder) => [
          changeOrder.title,
          changeOrder.description || '',
          changeOrder.changeType,
          formatCurrency(changeOrder.originalContractAmount),
          formatCurrency(changeOrder.newAmount),
          formatCurrency(changeOrder.costDifference),
          changeOrder.addedDays.toString(),
          formatDate(changeOrder.originalEndDate),
          formatDate(changeOrder.revisedEndDate),
          changeOrder.requestedBy,
          formatDate(changeOrder.submissionDate),
          changeOrder.notesOrJustification || '',
          changeOrder.toBeApprovedBy || 'Not assigned',
          changeOrder.keyStakeholder || '',
          changeOrder.status,
          changeOrder.approverSignature || '',
          formatDate(changeOrder.dateApproved),
          formatDate(changeOrder.dateRejected),
          changeOrder.rejectionReason || '',
          formatDate(changeOrder.createdAt),
          formatDate(changeOrder.updatedAt)
        ]}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
      />
    </div>
  );
}