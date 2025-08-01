'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogDescription,
  AlertDialogFooter 
} from '@/components/ui/alert-dialog'
import { User, Mail, Plus, ArrowRight } from 'lucide-react'

interface ProjectManagerData {
  name: string
  email: string
}

interface ProjectManagerManualAddModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveAndContinue: (managers: ProjectManagerData[]) => void
  onSaveAndAddMore: (manager: ProjectManagerData) => void
}

export function ProjectManagerManualAddModal({
  isOpen,
  onClose,
  onSaveAndContinue,
  onSaveAndAddMore
}: ProjectManagerManualAddModalProps) {
  const { t } = useTranslation('common')
  
  const [tempManagers, setTempManagers] = useState<ProjectManagerData[]>([])
  const [currentManager, setCurrentManager] = useState<ProjectManagerData>({
    name: '',
    email: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const validateManager = (manager: ProjectManagerData): { [key: string]: string } => {
    const newErrors: { [key: string]: string } = {}
    
    if (!manager.name.trim()) {
      newErrors.name = 'Manager name is required'
    }
    
    if (!manager.email.trim()) {
      newErrors.email = 'Email is required'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(manager.email)) {
        newErrors.email = 'Invalid email format'
      }
    }
    
    return newErrors
  }

  const handleSaveAndAddMore = () => {
    const validationErrors = validateManager(currentManager)
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    
    const newManager = { ...currentManager }
    setTempManagers(prev => [...prev, newManager])
    onSaveAndAddMore(newManager)
    
    // Reset form
    setCurrentManager({ name: '', email: '' })
    setErrors({})
  }

  const handleSaveAndContinue = () => {
    const validationErrors = validateManager(currentManager)
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    
    const allManagers = [...tempManagers, currentManager]
    onSaveAndContinue(allManagers)
    
    // Reset state
    setTempManagers([])
    setCurrentManager({ name: '', email: '' })
    setErrors({})
  }

  const handleClose = () => {
    setTempManagers([])
    setCurrentManager({ name: '', email: '' })
    setErrors({})
    onClose()
  }

  const isFormValid = currentManager.name.trim() && currentManager.email.trim()

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-full overflow-y-auto">
        <AlertDialogHeader className="relative">
          <AlertDialogTitle className="text-lg sm:text-xl pr-8">{t('admin.addProjectManager')}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm sm:text-base">
            Enter the project manager&apos;s information below. You can add multiple managers or save and continue to review all added managers.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 sm:py-6">
          <div className="space-y-6">
            {tempManagers.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{tempManagers.length}</span>
                  </div>
                  <span className="font-medium">
                    {tempManagers.length} manager{tempManagers.length !== 1 ? 's' : ''} added so far
                  </span>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="managerName" className="text-sm font-medium">
                    Manager Name *
                  </Label>
                  <Input
                    id="managerName"
                    value={currentManager.name}
                    onChange={(e) => {
                      setCurrentManager(prev => ({ ...prev, name: e.target.value }))
                      if (errors.name) setErrors(prev => ({ ...prev, name: '' }))
                    }}
                    placeholder="Enter manager name"
                    className={`${errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.name}
                    </p>
                  )}
                </div>

              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="managerEmail" className="text-sm font-medium">
                    Email *
                  </Label>
                  <Input
                    id="managerEmail"
                    type="email"
                    value={currentManager.email}
                    onChange={(e) => {
                      setCurrentManager(prev => ({ ...prev, email: e.target.value }))
                      if (errors.email) setErrors(prev => ({ ...prev, email: '' }))
                    }}
                    placeholder="manager@company.com"
                    className={`${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Cancel
          </Button>
          
          <Button 
            onClick={handleSaveAndAddMore} 
            disabled={!isFormValid}
            variant="outline"
            className="w-full sm:w-auto order-3 sm:order-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            Save & Add More
          </Button>
          
          <Button 
            onClick={handleSaveAndContinue} 
            disabled={!isFormValid}
            className="w-full sm:w-auto order-1 sm:order-3 bg-green-600 hover:bg-green-700"
          >
            Save & Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}