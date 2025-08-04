'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { setTheme, toggleTheme } from '@/lib/features/theme/themeSlice'
import { setLoading, setMembershipData, setError } from '@/lib/features/membership/membershipSlice'
import { adminLoginSuccess } from '@/lib/features/auth/authSlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  User, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  Moon, 
  Sun,
  Shield,
  Sparkles,
  Eye,
  EyeOff,
  Upload,
  X,
  Lock,
  AlertTriangle
} from 'lucide-react'

type Step = 'welcome' | 'company' | 'admin' | 'review' | 'complete'

interface FormData {
  companyName: string
  contactEmail: string
  contactPhone: string
  address: string
  logoFile: File | null
  adminName: string
  adminEmail: string
  adminPassword: string
  confirmPassword: string
}

interface FormErrors {
  [key: string]: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const theme = useAppSelector((state) => state.theme.mode)
  const membership = useAppSelector((state) => state.membership)
  
  const [currentStep, setCurrentStep] = useState<Step>('welcome')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    logoFile: null,
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: ''
  })

  const steps: Step[] = ['welcome', 'company', 'admin', 'review', 'complete']
  const currentStepIndex = steps.indexOf(currentStep)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  useEffect(() => {
    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      dispatch(setTheme(savedTheme))
    }
    
    // Verify membership access via API
    const checkMembership = async () => {
      console.log('Starting membership check...')
      dispatch(setLoading(true))
      
      try {
        const response = await fetch('/api/membership/verify')
        const result = await response.json()
        console.log('API response:', response.status, result)
        
        if (response.ok && result.hasLevel3Access) {
          // Check if user already has a company with auto-login
          if (result.hasExistingCompany && result.autoLogin && result.authData) {
            // Update Redux state with admin login data
            dispatch(adminLoginSuccess(result.authData))
            
            // Redirect to admin dashboard
            router.push('/admin')
            return
          }
          
          // Check if user already has a company but no auto-login (fallback)
          if (result.hasExistingCompany && result.redirectTo) {
            router.push(result.redirectTo)
            return
          }
          
          // Has access
          console.log('User has access')
          dispatch(setMembershipData({
            user: result.user,
            memberships: result.memberships,
            hasLevel3Access: true
          }))
        } else {
          // No access (either 401, 200 with no access, or API error)
          console.log('User has no access')
          dispatch(setMembershipData({
            user: result.user || null,
            memberships: result.memberships || [],
            hasLevel3Access: false,
          }))
        }
      } catch (error) {
        // Network error - treat as no access
        console.log('Network error:', error)
        dispatch(setMembershipData({
          user: null,
          memberships: [],
          hasLevel3Access: false
        }))
      }
    }
    
    checkMembership()
  }, [])

  const validateStep = (step: Step): boolean => {
    const newErrors: FormErrors = {}
    
    switch (step) {
      case 'company':
        if (!formData.companyName.trim()) {
          newErrors.companyName = 'Company name is required'
        }
        if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
          newErrors.contactEmail = 'Please enter a valid email address'
        }
        break
      
      case 'admin':
        if (!formData.adminName.trim()) {
          newErrors.adminName = 'Full name is required'
        }
        if (!formData.adminEmail.trim()) {
          newErrors.adminEmail = 'Email is required'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
          newErrors.adminEmail = 'Please enter a valid email address'
        }
        if (!formData.adminPassword) {
          newErrors.adminPassword = 'Password is required'
        } else if (formData.adminPassword.length < 8) {
          newErrors.adminPassword = 'Password must be at least 8 characters'
        }
        if (formData.adminPassword !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match'
        }
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData(prev => ({
      ...prev,
      logoFile: file
    }))
  }

  const handleRemoveLogo = () => {
    setFormData(prev => ({
      ...prev,
      logoFile: null
    }))
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      const nextIndex = currentStepIndex + 1
      if (nextIndex < steps.length) {
        setCurrentStep(steps[nextIndex])
      }
    }
  }

  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex])
    }
  }

  const handleSubmit = async () => {
    if (!validateStep('admin')) return
    
    setIsLoading(true)
    try {
      const submitData = new FormData()
      submitData.append('companyName', formData.companyName)
      submitData.append('contactEmail', formData.contactEmail)
      submitData.append('contactPhone', formData.contactPhone)
      submitData.append('address', formData.address)
      submitData.append('adminName', formData.adminName)
      submitData.append('adminEmail', formData.adminEmail)
      submitData.append('adminPassword', formData.adminPassword)
      
      if (formData.logoFile) {
        submitData.append('logoFile', formData.logoFile)
      }

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        body: submitData
      })

      const result = await response.json()
      
      if (response.ok) {
        // Check if this is an auto-login response (existing or new company)
        if (result.autoLogin && result.authData) {
          // Update Redux state with admin login data
          dispatch(adminLoginSuccess(result.authData))
          
          // Redirect to admin dashboard
          router.push('/admin/onboarding')
          return
        }
        
        // Normal successful onboarding (fallback - shouldn't happen now)
        setCurrentStep('complete')
        setTimeout(() => {
          router.push('/admin/login')
        }, 3000)
      } else {
        // Check if user already has a company and should be redirected
        if (response.status === 409 && result.redirectTo) {
          router.push(result.redirectTo)
          return
        }
        
        setErrors({ submit: result.message || 'Failed to create company and super-admin' })
      }
    } catch (error) {
      console.error('Onboarding error:', error)
      setErrors({ submit: 'An error occurred during onboarding' })
    } finally {
      setIsLoading(false)
    }
  }

  const renderWelcomeStep = () => (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Welcome to JHA App
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {`Let's get your company set up with a comprehensive Job Hazard Analysis and safety management system.`}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold">Company Setup</h3>
          <p className="text-sm text-muted-foreground">Configure your company information and settings</p>
        </div>
        
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="font-semibold">Admin Account</h3>
          <p className="text-sm text-muted-foreground">Create your super-admin account with full access</p>
        </div>
        
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-semibold">Ready to Go</h3>
          <p className="text-sm text-muted-foreground">Start managing safety and compliance</p>
        </div>
      </div>
      
      <Button onClick={handleNext} size="lg" className="px-8">
        Get Started
        <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </div>
  )

  const renderCompanyStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Building2 className="w-12 h-12 mx-auto text-blue-600" />
        <h2 className="text-2xl font-bold">Company Information</h2>
        <p className="text-muted-foreground">Tell us about your company</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="companyName">Company Name *</Label>
          <Input
            id="companyName"
            name="companyName"
            type="text"
            required
            value={formData.companyName}
            onChange={handleInputChange}
            placeholder="Enter your company name"
            className={errors.companyName ? 'border-destructive' : ''}
          />
          {errors.companyName && (
            <p className="text-sm text-destructive mt-1">{errors.companyName}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            value={formData.contactEmail}
            onChange={handleInputChange}
            placeholder="company@example.com"
            className={errors.contactEmail ? 'border-destructive' : ''}
          />
          {errors.contactEmail && (
            <p className="text-sm text-destructive mt-1">{errors.contactEmail}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="contactPhone">Contact Phone</Label>
          <Input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            value={formData.contactPhone}
            onChange={handleInputChange}
            placeholder="(555) 123-4567"
          />
        </div>
        
        <div>
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            name="address"
            type="text"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Company address"
          />
        </div>
        
        <div>
          <Label htmlFor="logoFile">Company Logo (Optional)</Label>
          <div className="space-y-2">
            {formData.logoFile ? (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                <img 
                  src={URL.createObjectURL(formData.logoFile)} 
                  alt="Logo preview" 
                  className="w-12 h-12 object-contain bg-white rounded border"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{formData.logoFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(formData.logoFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveLogo}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  id="logoFile"
                  name="logoFile"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex items-center gap-3 p-6 border-2 border-dashed rounded-lg text-center hover:bg-muted/50 transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Upload company logo</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, or GIF (Max 5MB)</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const renderAdminStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Shield className="w-12 h-12 mx-auto text-purple-600" />
        <h2 className="text-2xl font-bold">Super-Admin Account</h2>
        <p className="text-muted-foreground">Create your administrative account</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="adminName">Full Name *</Label>
          <Input
            id="adminName"
            name="adminName"
            type="text"
            required
            value={formData.adminName}
            onChange={handleInputChange}
            placeholder="Enter your full name"
            className={errors.adminName ? 'border-destructive' : ''}
          />
          {errors.adminName && (
            <p className="text-sm text-destructive mt-1">{errors.adminName}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="adminEmail">Email *</Label>
          <Input
            id="adminEmail"
            name="adminEmail"
            type="email"
            required
            value={formData.adminEmail}
            onChange={handleInputChange}
            placeholder="admin@company.com"
            className={errors.adminEmail ? 'border-destructive' : ''}
          />
          {errors.adminEmail && (
            <p className="text-sm text-destructive mt-1">{errors.adminEmail}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="adminPassword">Password *</Label>
          <div className="relative">
            <Input
              id="adminPassword"
              name="adminPassword"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.adminPassword}
              onChange={handleInputChange}
              placeholder="Enter secure password (min 8 chars)"
              className={errors.adminPassword ? 'border-destructive' : ''}
              minLength={8}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {errors.adminPassword && (
            <p className="text-sm text-destructive mt-1">{errors.adminPassword}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="confirmPassword">Confirm Password *</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm your password"
              className={errors.confirmPassword ? 'border-destructive' : ''}
              minLength={8}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-destructive mt-1">{errors.confirmPassword}</p>
          )}
        </div>
      </div>
    </div>
  )

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <CheckCircle className="w-12 h-12 mx-auto text-green-600" />
        <h2 className="text-2xl font-bold">Review & Confirm</h2>
        <p className="text-muted-foreground">Please review your information before creating your account</p>
      </div>
      
      <div className="space-y-6">
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Company Information
          </h3>
          <div className="space-y-2 text-sm">
            <div><strong>Name:</strong> {formData.companyName}</div>
            {formData.contactEmail && <div><strong>Email:</strong> {formData.contactEmail}</div>}
            {formData.contactPhone && <div><strong>Phone:</strong> {formData.contactPhone}</div>}
            {formData.address && <div><strong>Address:</strong> {formData.address}</div>}
          </div>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Super-Admin Account
          </h3>
          <div className="space-y-2 text-sm">
            <div><strong>Name:</strong> {formData.adminName}</div>
            <div><strong>Email:</strong> {formData.adminEmail}</div>
            <div className="flex items-center gap-2">
              <strong>Role:</strong> 
              <Badge variant="default" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Super Admin
              </Badge>
            </div>
          </div>
        </div>
        
        {errors.submit && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive text-sm">{errors.submit}</p>
          </div>
        )}
      </div>
    </div>
  )

  const renderAccessDenied = () => (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center">
          <Lock className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-red-600">
          Access Restricted
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          You need proper membership access to use the onboarding system.
        </p>
      </div>
      
      {membership.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md mx-auto">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm">{membership.error}</p>
          </div>
        </div>
      )}
      
      <div className="bg-muted/50 rounded-lg p-6 max-w-md mx-auto">
        <h3 className="font-semibold mb-4">Need Access?</h3>
        <div className="space-y-3 text-sm text-left">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <span>Contact your account manager</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <span>Upgrade your membership</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <span>Verify your subscription status</span>
          </div>
        </div>
      </div>
      
      <Button onClick={() => router.push('/')} size="lg" className="px-8">
        Return to Dashboard
        <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </div>
  )

  const renderCompleteStep = () => (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-green-600">
          Welcome to JHA App!
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {`Your company and super-admin account have been created successfully. You'll be redirected to the login page shortly`}.
        </p>
      </div>
      
      <div className="bg-muted/50 rounded-lg p-6 max-w-md mx-auto">
        <h3 className="font-semibold mb-4">{`What's Next?`}</h3>
        <div className="space-y-3 text-sm text-left">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Login with your super-admin credentials</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Configure your company modules</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Add contractors and team members</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Start managing safety compliance</span>
          </div>
        </div>
      </div>
      
      <Button onClick={() => router.push('/admin/login')} size="lg" className="px-8">
        Go to Login
        <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => dispatch(toggleTheme())}
          className="w-10 h-10 p-0"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          {currentStep !== 'welcome' && currentStep !== 'complete' && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Step {currentStepIndex} of {steps.length - 2}</span>
                <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Main Content */}
          <Card className="border-0 shadow-xl">
            <CardContent className="p-8 md:p-12">
              {membership.isLoading ? (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted-foreground">Verifying membership access...</p>
                </div>
              ) : membership.hasLevel3Access ? (
                <>
                  {currentStep === 'welcome' && renderWelcomeStep()}
                  {currentStep === 'company' && renderCompanyStep()}
                  {currentStep === 'admin' && renderAdminStep()}
                  {currentStep === 'review' && renderReviewStep()}
                  {currentStep === 'complete' && renderCompleteStep()}
                </>
              ) : (
                renderAccessDenied()
              )}
            </CardContent>
          </Card>
          
          {/* Navigation */}
          {membership.hasLevel3Access && currentStep !== 'welcome' && currentStep !== 'complete' && (
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStepIndex === 1}
              >
                <ArrowLeft className="mr-2 w-4 h-4" />
                Previous
              </Button>
              
              {currentStep === 'review' ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-8"
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                  <CheckCircle className="ml-2 w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={handleNext} className="px-8">
                  Next
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}