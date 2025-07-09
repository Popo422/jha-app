'use client'

import { useEffect, useState } from 'react'
import { useAppSelector } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AdminDataTable } from '@/components/admin/AdminDataTable'
import { Plus, UserCheck, Shield, Lock, ArrowLeft, Eye, EyeOff, Save, X } from 'lucide-react'

interface AdminUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'super-admin'
  companyName: string
  createdAt: string
}

export default function AdminEditorPage() {
  const { admin } = useAppSelector((state) => state.auth)
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState<'list' | 'add' | 'edit'>('list')
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  useEffect(() => {
    // Check if current user is at least admin
    if (!admin || !['admin', 'super-admin'].includes(admin.role)) {
      alert('Access denied. Admin privileges required.')
      window.location.href = '/admin'
      return
    }
    
    fetchAdmins()
  }, [admin])

  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setAdmins(data.admins)
      }
    } catch (error) {
      console.error('Error fetching admins:', error)
    } finally {
      setIsLoading(false)
    }
  }

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
      newErrors.name = 'Full name is required'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    // Password validation - required for add, optional for edit
    if (currentView === 'add') {
      if (!formData.password) {
        newErrors.password = 'Password is required'
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
    
    setIsSubmitting(true)

    try {
      if (currentView === 'edit' && editingAdmin) {
        // Update existing admin
        const updateData: any = {
          name: formData.name,
          email: formData.email,
          role: formData.role
        }
        
        // Only include password if it's provided
        if (formData.password) {
          updateData.password = formData.password
        }
        
        const response = await fetch(`/api/admin/users/${editingAdmin.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        })

        if (response.ok) {
          // Success - reset form and go back to list
          setFormData({ name: '', email: '', password: '', confirmPassword: '', role: 'admin' })
          setEditingAdmin(null)
          setErrors({})
          setCurrentView('list')
          fetchAdmins()
        } else {
          const error = await response.json()
          setErrors({ submit: error.message || 'Failed to update admin user' })
        }
      } else {
        // Create new admin
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        })

        if (response.ok) {
          // Success - reset form and go back to list
          setFormData({ name: '', email: '', password: '', confirmPassword: '', role: 'admin' })
          setErrors({})
          setCurrentView('list')
          fetchAdmins()
        } else {
          const error = await response.json()
          setErrors({ submit: error.message || 'Failed to create admin user' })
        }
      }
    } catch (error) {
      console.error('Error saving admin:', error)
      setErrors({ submit: 'An error occurred while saving the admin user' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (adminId: string, updates: Partial<AdminUser>) => {
    try {
      const response = await fetch(`/api/admin/users/${adminId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        fetchAdmins()
      } else {
        const error = await response.json()
        console.error('Update error:', error.message)
      }
    } catch (error) {
      console.error('Error updating admin:', error)
    }
  }

  const handleDelete = async (adminId: string) => {
    // Find the admin to delete
    const adminToDelete = admins.find(a => a.id === adminId)
    
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
      const response = await fetch(`/api/admin/users/${adminId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchAdmins()
      } else {
        const error = await response.json()
        console.error('Delete error:', error.message)
      }
    } catch (error) {
      console.error('Error deleting admin:', error)
    }
  }

  if (!admin || !['admin', 'super-admin'].includes(admin.role)) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-destructive">Access denied. Admin privileges required.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const columns = [
    {
      accessorKey: 'name',
      header: 'Name'
    },
    {
      accessorKey: 'email',
      header: 'Email'
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Badge variant={row.original.role === 'super-admin' ? 'default' : 'secondary'}>
            {row.original.role === 'super-admin' ? (
              <><Shield className="w-3 h-3 mr-1" /> Super Admin</>
            ) : (
              <><UserCheck className="w-3 h-3 mr-1" /> Admin</>
            )}
          </Badge>
          {row.original.role === 'super-admin' && (
            <div className="flex items-center text-xs text-muted-foreground" title="Protected account - cannot be deleted">
              <Lock className="w-3 h-3 mr-1" />
              Protected
            </div>
          )}
        </div>
      )
    },
    {
      accessorKey: 'companyName',
      header: 'Company'
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
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
            <span>Back</span>
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          {currentView === 'add' ? 'Add New Admin' : 'Edit Admin'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {currentView === 'add' 
            ? 'Create a new admin user for your company' 
            : 'Update admin user information'
          }
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                  className={errors.name ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="admin@company.com"
                  className={errors.email ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.role ? 'border-red-500' : ''}`}
              >
                <option value="admin">Admin</option>
                {admin?.role === 'super-admin' && (
                  <option value="super-admin">Super Admin</option>
                )}
              </select>
              {errors.role && (
                <p className="text-sm text-red-500">{errors.role}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {currentView === 'add' ? '' : '(optional)'}
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
                      ? "Leave blank to keep current password" 
                      : "Enter secure password (min 8 chars)"
                    }
                    className={errors.password ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
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
                  Confirm Password {currentView === 'add' ? '' : '(if changing)'}
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
                      ? "Confirm new password" 
                      : "Confirm password"
                    }
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isSubmitting}
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
                disabled={isSubmitting}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isSubmitting 
                  ? (currentView === 'edit' ? 'Updating...' : 'Creating...') 
                  : (currentView === 'edit' ? 'Update Admin' : 'Add Admin')
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
                disabled={isSubmitting}
                className="flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
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
          <h1 className="text-3xl font-bold">Admin Editor</h1>
          <p className="text-muted-foreground">
            {admin?.role === 'super-admin' 
              ? 'Manage admin users' 
              : 'Add new admin users to your company'
            }
          </p>
        </div>
        <Button 
          onClick={() => setCurrentView('add')} 
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Admin
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin Users</CardTitle>
          <CardDescription>Manage admin users in your company</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminDataTable
            columns={columns}
            data={admins}
            isLoading={isLoading}
            isFetching={false}
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
            exportHeaders={['Name', 'Email', 'Role', 'Company', 'Created At']}
            getExportData={(admin) => [
              admin.name || '',
              admin.email || '',
              admin.role || '',
              admin.companyName || '',
              new Date(admin.createdAt).toLocaleDateString()
            ]}
          />
        </CardContent>
      </Card>
    </div>
  )
}