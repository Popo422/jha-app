'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/lib/hooks'
import { useGetAdminUsersQuery, useCreateAdminUserMutation, useUpdateAdminUserMutation, useDeleteAdminUserMutation, type AdminUser, type PaginationInfo } from '@/lib/features/admin-users/adminUsersApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AdminDataTable } from '@/components/admin/AdminDataTable'
import { Plus, UserCheck, Shield, Lock, ArrowLeft, Eye, EyeOff, Save, X } from 'lucide-react'

// AdminUser interface is now imported from the API

export default function AdminEditorPage() {
  const { t } = useTranslation('common')
  const { admin } = useAppSelector((state) => state.auth)
  const [currentView, setCurrentView] = useState<'list' | 'add' | 'edit'>('list')
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin' as 'admin' | 'super-admin'
  })
  const [clientPagination, setClientPagination] = useState({
    currentPage: 1,
    pageSize: 10
  });
  const [serverPagination, setServerPagination] = useState({
    page: 1,
    pageSize: 50
  });

  // RTK Query hooks
  const { data: adminUsersData, isLoading, isFetching, refetch } = useGetAdminUsersQuery({
    page: serverPagination.page,
    pageSize: serverPagination.pageSize
  });
  
  const [createAdminUser, { isLoading: isCreating }] = useCreateAdminUserMutation();
  const [updateAdminUser, { isLoading: isUpdating }] = useUpdateAdminUserMutation();
  const [deleteAdminUser] = useDeleteAdminUserMutation();

  const allAdmins = adminUsersData?.admins || [];
  const serverPaginationInfo = adminUsersData?.pagination;

  // Client-side pagination logic
  const startIndex = (clientPagination.currentPage - 1) * clientPagination.pageSize;
  const endIndex = startIndex + clientPagination.pageSize;
  const data = allAdmins.slice(startIndex, endIndex);
  
  // Create client pagination info
  const totalClientPages = Math.ceil(allAdmins.length / clientPagination.pageSize);
  
  // Calculate total pages considering both client view and server data
  const estimatedTotalRecords = serverPaginationInfo?.total || allAdmins.length;
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

  useEffect(() => {
    // Check if current user is at least admin
    if (!admin || !['admin', 'super-admin'].includes(admin.role)) {
      // Use a timeout to avoid setState during render
      setTimeout(() => {
        alert(t('admin.accessDenied'))
        window.location.href = '/admin'
      }, 0)
      return
    }
  }, [admin, t])

  const handlePageChange = useCallback((page: number) => {
    const totalClientPages = Math.ceil(allAdmins.length / clientPagination.pageSize);
    
    if (page <= totalClientPages) {
      // Navigate within current batch
      setClientPagination(prev => ({ ...prev, currentPage: page }));
    } else {
      // Need to fetch next batch
      const nextServerPage = serverPagination.page + 1;
      setServerPagination(prev => ({ ...prev, page: nextServerPage }));
      setClientPagination({ currentPage: 1, pageSize: clientPagination.pageSize });
    }
  }, [allAdmins.length, clientPagination.pageSize, serverPagination.page]);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setClientPagination({ currentPage: 1, pageSize });
  }, []);

  // Prefetch next batch when near end
  const { data: prefetchData } = useGetAdminUsersQuery({
    page: serverPagination.page + 1,
    pageSize: serverPagination.pageSize
  }, {
    skip: !shouldPrefetch
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({}) // Clear previous errors
    
    // Validate form
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = t('admin.fullName') + ' is required'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = t('auth.email') + ' is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    // Password validation - required for add, optional for edit
    if (currentView === 'add') {
      if (!formData.password) {
        newErrors.password = t('auth.password') + ' is required'
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters'
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    } else if (currentView === 'edit' && formData.password) {
      // If editing and password is provided, validate it
      if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters'
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      if (currentView === 'edit' && editingAdmin) {
        // Update existing admin
        const updateData: any = {
          id: editingAdmin.id,
          name: formData.name,
          email: formData.email,
          role: formData.role
        }
        
        // Only include password if it's provided
        if (formData.password) {
          updateData.password = formData.password
        }
        
        await updateAdminUser(updateData).unwrap()
        
        // Success - reset form and go back to list
        setFormData({ name: '', email: '', password: '', confirmPassword: '', role: 'admin' })
        setEditingAdmin(null)
        setErrors({})
        setCurrentView('list')
      } else {
        // Create new admin
        await createAdminUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role
        }).unwrap()

        // Success - reset form and go back to list
        setFormData({ name: '', email: '', password: '', confirmPassword: '', role: 'admin' })
        setErrors({})
        setCurrentView('list')
      }
    } catch (error: any) {
      console.error('Error saving admin:', error)
      setErrors({ submit: error.data?.message || 'An error occurred while saving the admin user' })
    }
  }

  const handleDelete = async (adminId: string) => {
    // Find the admin to delete
    const adminToDelete = allAdmins.find(a => a.id === adminId)
    
    if (!adminToDelete) {
      return
    }

    // Prevent deletion of super-admins
    if (adminToDelete.role === 'super-admin') {
      return
    }

    // Prevent deletion of own account
    if (adminId === admin?.id) {
      return
    }

    try {
      await deleteAdminUser(adminId).unwrap()
    } catch (error: any) {
      console.error('Error deleting admin:', error)
    }
  }

  if (!admin || !['admin', 'super-admin'].includes(admin.role)) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-destructive">{t('admin.accessDenied')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const columns = [
    {
      accessorKey: 'name',
      header: t('admin.name')
    },
    {
      accessorKey: 'email',
      header: t('auth.email')
    },
    {
      accessorKey: 'role',
      header: t('admin.role'),
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Badge variant={row.original.role === 'super-admin' ? 'default' : 'secondary'}>
            {row.original.role === 'super-admin' ? (
              <><Shield className="w-3 h-3 mr-1" /> {t('admin.superAdmin')}</>
            ) : (
              <><UserCheck className="w-3 h-3 mr-1" /> {t('admin.admin')}</>
            )}
          </Badge>
          {row.original.role === 'super-admin' && (
            <div className="flex items-center text-xs text-muted-foreground" title={t('admin.protectedAccountTooltip')}>
              <Lock className="w-3 h-3 mr-1" />
              {t('admin.protected')}
            </div>
          )}
        </div>
      )
    },
    {
      accessorKey: 'companyName',
      header: t('admin.company')
    },
    {
      accessorKey: 'createdAt',
      header: t('admin.created'),
      cell: ({ row }: any) => new Date(row.original.createdAt).toLocaleDateString()
    }
  ]

  // Render form view (add/edit)
  const renderFormView = () => (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button variant="ghost" onClick={() => {
            setCurrentView('list')
            setEditingAdmin(null)
            setFormData({ name: '', email: '', password: '', confirmPassword: '', role: 'admin' })
            setErrors({})
          }} className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>{t('common.back')}</span>
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          {currentView === 'add' ? t('admin.addNewAdmin') : t('admin.editAdmin')}
        </h1>
        <p className="text-muted-foreground mt-2">
          {currentView === 'add' 
            ? t('admin.createNewAdmin') 
            : t('admin.updateAdminInfo')
          }
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.adminInformation')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('admin.fullName')}</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder={t('admin.enterFullName')}
                  className={errors.name ? 'border-red-500' : ''}
                  disabled={isCreating || isUpdating}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">{t('admin.emailAddress')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={t('admin.adminEmailPlaceholder')}
                  className={errors.email ? 'border-red-500' : ''}
                  disabled={isCreating || isUpdating}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">{t('admin.role')}</Label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                disabled={isCreating || isUpdating}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.role ? 'border-red-500' : ''}`}
              >
                <option value="admin">{t('admin.admin')}</option>
                {admin?.role === 'super-admin' && (
                  <option value="super-admin">{t('admin.superAdmin')}</option>
                )}
              </select>
              {errors.role && (
                <p className="text-sm text-red-500">{errors.role}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">
                  {t('auth.password')} {currentView === 'add' ? '' : `(${t('admin.passwordOptional').split(' ')[1]})`}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required={currentView === 'add'}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={currentView === 'edit' 
                      ? t('admin.leaveBlankKeepCurrent') 
                      : t('admin.enterSecurePassword')
                    }
                    className={errors.password ? 'border-red-500' : ''}
                    disabled={isCreating || isUpdating}
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isCreating || isUpdating}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {t('admin.confirmPassword')} {currentView === 'add' ? '' : `(${t('admin.confirmPasswordOptional').split(' ')[2]} ${t('admin.confirmPasswordOptional').split(' ')[3]})`}
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required={currentView === 'add'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder={currentView === 'edit' 
                      ? t('admin.confirmNewPassword') 
                      : t('admin.confirmPassword')
                    }
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                    disabled={isCreating || isUpdating}
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isCreating || isUpdating}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {errors.submit && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {errors.submit}
              </div>
            )}

            <div className="flex space-x-4 pt-4">
              <Button
                type="submit"
                disabled={isCreating || isUpdating}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{(isCreating || isUpdating)
                  ? (currentView === 'edit' ? t('admin.updating') : t('admin.creating')) 
                  : (currentView === 'edit' ? t('admin.updateAdmin') : t('admin.addAdmin'))
                }</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCurrentView('list')
                  setEditingAdmin(null)
                  setFormData({ name: '', email: '', password: '', confirmPassword: '', role: 'admin' })
                  setErrors({})
                }}
                disabled={isCreating || isUpdating}
                className="flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>{t('common.cancel')}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );

  if (currentView === 'add' || currentView === 'edit') {
    return (
      <div className="p-4 md:p-6">
        {renderFormView()}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.adminEditorTitle')}</h1>
          <p className="text-muted-foreground">
            {admin?.role === 'super-admin' 
              ? t('admin.adminEditorDescription') 
              : t('admin.createNewAdmin')
            }
          </p>
        </div>
        <Button 
          onClick={() => setCurrentView('add')} 
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('admin.addAdmin')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.adminUsers')}</CardTitle>
          <CardDescription>{t('admin.adminEditorDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminDataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            isFetching={isFetching}
            onEdit={admin?.role === 'super-admin' ? (adminUser) => {
              setEditingAdmin(adminUser)
              setFormData({
                name: adminUser.name,
                email: adminUser.email,
                password: '',
                confirmPassword: '',
                role: adminUser.role
              })
              setCurrentView('edit')
            } : undefined}
            onDelete={admin?.role === 'super-admin' ? (id) => handleDelete(id) : undefined}
            getRowId={(admin) => admin.id}
            canDelete={(adminUser) => admin?.role === 'super-admin' && adminUser.role !== 'super-admin' && adminUser.id !== admin?.id}
            exportFilename="admin_users"
            exportHeaders={[t('admin.name'), t('auth.email'), t('admin.role'), t('admin.company'), t('admin.created')]}
            getExportData={(admin) => [
              admin.name || '',
              admin.email || '',
              admin.role || '',
              admin.companyName || '',
              new Date(admin.createdAt).toLocaleDateString()
            ]}
            serverSide={true}
            pagination={paginationInfo}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </CardContent>
      </Card>
    </div>
  )
}