"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  MoreVertical, 
  Download, 
  Trash2, 
  Edit, 
  ChevronDown,
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { useIsMobile } from "@/hooks/use-mobile";

export interface CustomAction<T> {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: (item: T) => void;
  className?: string;
  show?: (item: T) => boolean;
}

export interface AdminDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading: boolean;
  isFetching: boolean;
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  getRowId: (item: T) => string;
  exportFilename: string;
  exportHeaders: string[];
  getExportData: (item: T) => string[];
  filters?: React.ReactNode;
  renderMobileCard?: (item: T, isSelected: boolean, onToggleSelect: () => void, showCheckboxes: boolean) => React.ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  canDelete?: (item: T) => boolean;
  customActions?: CustomAction<T>[];
}

export function AdminDataTable<T>({
  data,
  columns: baseColumns,
  isLoading,
  isFetching,
  onEdit,
  onDelete,
  onBulkDelete,
  getRowId,
  exportFilename,
  exportHeaders,
  getExportData,
  filters,
  renderMobileCard,
  searchValue = "",
  onSearchChange,
  canDelete,
  customActions = [],
}: AdminDataTableProps<T>) {
  const { t } = useTranslation('common');
  const [rowSelection, setRowSelection] = useState({});
  const [showCheckboxes, setShowCheckboxes] = useState(false);
  const isMobile = useIsMobile();

  const handleSingleDelete = useCallback(async (id: string) => {
    if (onDelete) {
      await onDelete(id);
    }
  }, [onDelete]);

  const handleDeleteButtonClick = useCallback(() => {
    if (!showCheckboxes) {
      setShowCheckboxes(true);
    } else {
      const selectedIds = Object.keys(rowSelection);
      if (selectedIds.length === 0) {
        setShowCheckboxes(false);
        setRowSelection({});
      } else {
        handleBulkDelete();
      }
    }
  }, [showCheckboxes, rowSelection]);

  const handleBulkDelete = useCallback(async () => {
    const selectedIds = Object.keys(rowSelection);
    if (onBulkDelete) {
      await onBulkDelete(selectedIds);
    }
    setRowSelection({});
    setShowCheckboxes(false);
  }, [rowSelection, onBulkDelete]);

  const handleCancelSelection = useCallback(() => {
    setShowCheckboxes(false);
    setRowSelection({});
  }, []);

  const columns = useMemo<ColumnDef<T>[]>(() => {
    const tableColumns: ColumnDef<T>[] = [];

    if (showCheckboxes) {
      tableColumns.push({
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(value) => table.toggleAllPageRowsSelected(!!value.target.checked)}
            className="w-4 h-4"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={(value) => row.toggleSelected(!!value.target.checked)}
            className="w-4 h-4"
          />
        ),
      });
    }

    tableColumns.push(...baseColumns);

    if (onEdit || onDelete || customActions.length > 0) {
      tableColumns.push({
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {customActions.map((action, index) => {
                  if (action.show && !action.show(item)) return null;
                  const Icon = action.icon;
                  return (
                    <DropdownMenuItem 
                      key={index}
                      onClick={() => action.onClick(item)}
                      className={`cursor-pointer ${action.className || ''}`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {action.label}
                    </DropdownMenuItem>
                  );
                })}
                {onEdit && (
                  <DropdownMenuItem 
                    onClick={() => onEdit(item)}
                    className="cursor-pointer"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {t('common.edit')}
                  </DropdownMenuItem>
                )}
                {onDelete && (!canDelete || canDelete(item)) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        onSelect={(e) => e.preventDefault()}
                        className="cursor-pointer text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('common.delete')}
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin.deleteItem')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('admin.deleteConfirmation')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleSingleDelete(getRowId(item))}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {t('common.delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      });
    }

    return tableColumns;
  }, [showCheckboxes, baseColumns, onEdit, onDelete, handleSingleDelete, getRowId]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    getRowId: (row) => getRowId(row),
  });

  const exportToCSV = useCallback(() => {
    const csvData = table.getFilteredRowModel().rows.map(row => getExportData(row.original));

    const csvContent = [exportHeaders, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportFilename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }, [table, exportHeaders, exportFilename, getExportData]);

  const TableSkeleton = () => (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            {showCheckboxes && (
              <th className="text-left px-3 py-2 font-medium text-sm">
                <Skeleton className="h-4 w-4" />
              </th>
            )}
            {Array.from({ length: baseColumns.length }).map((_, index) => (
              <th key={index} className="text-left px-3 py-2 font-medium text-sm">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
            {(onEdit || onDelete || customActions.length > 0) && (
              <th className="text-left px-3 py-2 font-medium text-sm">
                <Skeleton className="h-4 w-8" />
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, index) => (
            <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
              {showCheckboxes && (
                <td className="px-3 py-2">
                  <Skeleton className="h-4 w-4" />
                </td>
              )}
              {Array.from({ length: baseColumns.length }).map((_, colIndex) => (
                <td key={colIndex} className="px-3 py-2">
                  <Skeleton className="h-4 w-24" />
                </td>
              ))}
              {(onEdit || onDelete || customActions.length > 0) && (
                <td className="px-3 py-2">
                  <Skeleton className="h-6 w-6 rounded" />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const MobileCardSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={index} className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 space-y-4">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            {filters}
            
            <div className="space-y-1">
              <div className="text-sm font-medium">{t('common.search')}</div>
              <Input
                placeholder={t('admin.searchAllColumns')}
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full md:w-64"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {isLoading ? (
              <>
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-28" />
              </>
            ) : (
              <>
                {showCheckboxes ? (
                  <>
                    {Object.keys(rowSelection).length > 0 ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('admin.deleteSelected')} ({Object.keys(rowSelection).length})
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('admin.deleteSelectedItems')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('admin.deleteSelectedConfirmation', { count: Object.keys(rowSelection).length })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={handleBulkDelete}>{t('common.delete')}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button variant="destructive" onClick={handleDeleteButtonClick}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('admin.cancelSelection')}
                      </Button>
                    )}
                    <Button variant="outline" onClick={handleCancelSelection}>
                      {t('common.cancel')}
                    </Button>
                  </>
                ) : (
                  onDelete && (
                    <Button 
                      variant="outline" 
                      onClick={handleDeleteButtonClick}
                      disabled={table.getFilteredRowModel().rows.length === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('common.delete')}
                    </Button>
                  )
                )}
                
                <Button 
                  variant="outline" 
                  onClick={exportToCSV}
                  disabled={table.getFilteredRowModel().rows.length === 0 || isFetching}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('admin.exportCSV')}
                </Button>
              </>
            )}
          </div>
        </div>

        {isLoading || isFetching ? (
          isMobile ? <MobileCardSkeleton /> : <TableSkeleton />
        ) : isMobile ? (
          <div className="space-y-4">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const item = row.original;
                const isSelected = row.getIsSelected();
                const onToggleSelect = () => row.toggleSelected();
                
                if (renderMobileCard) {
                  return (
                    <div key={row.id}>
                      {renderMobileCard(item, isSelected, onToggleSelect, showCheckboxes)}
                    </div>
                  );
                }
                
                // Default mobile card if no custom renderer provided
                return (
                  <Card key={row.id} className="p-4">
                    <CardContent className="p-0">
                      <div className="flex justify-between items-start mb-3">
                        {showCheckboxes && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={onToggleSelect}
                            className="w-4 h-4 mt-1"
                          />
                        )}
                        <div className="flex-1">
                          {row.getVisibleCells().slice(showCheckboxes ? 1 : 0, -1).map((cell) => (
                            <div key={cell.id} className="mb-2">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                {typeof cell.column.columnDef.header === 'string' 
                                  ? cell.column.columnDef.header 
                                  : cell.column.id}:
                              </span>
                              <div className="text-sm">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            </div>
                          ))}
                        </div>
                        {(onEdit || onDelete || customActions.length > 0) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {customActions.map((action, index) => {
                                if (action.show && !action.show(item)) return null;
                                const Icon = action.icon;
                                return (
                                  <DropdownMenuItem 
                                    key={index}
                                    onClick={() => action.onClick(item)}
                                    className={`cursor-pointer ${action.className || ''}`}
                                  >
                                    <Icon className="h-4 w-4 mr-2" />
                                    {action.label}
                                  </DropdownMenuItem>
                                );
                              })}
                              {onEdit && (
                                <DropdownMenuItem 
                                  onClick={() => onEdit(item)}
                                  className="cursor-pointer"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  {t('common.edit')}
                                </DropdownMenuItem>
                              )}
                              {onDelete && (!canDelete || canDelete(item)) && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      onSelect={(e) => e.preventDefault()}
                                      className="cursor-pointer text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      {t('common.delete')}
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{t('admin.deleteItem')}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {t('admin.deleteConfirmation')}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleSingleDelete(getRowId(item))}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        {t('common.delete')}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="p-8">
                <div className="text-center text-sm text-gray-500">
                  {t('admin.noResults')}
                </div>
              </Card>
            )}
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-gray-200 dark:border-gray-700">
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="text-left px-3 py-2 font-medium text-sm whitespace-nowrap">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-2 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="h-16 text-center text-sm text-gray-500">
                      {t('admin.noResults')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between py-4">
          <div className="text-sm text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <>
                {table.getFilteredSelectedRowModel().rows.length} of{" "}
                {table.getFilteredRowModel().rows.length} row(s) selected.
              </>
            )}
          </div>
          <div className="flex gap-2">
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-16" />
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="flex-1 md:flex-none"
                >
                  {t('common.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="flex-1 md:flex-none"
                >
                  {t('common.next')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}