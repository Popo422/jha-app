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
import { Building2, MapPin, FileText, Plus, ArrowRight } from 'lucide-react'

interface ProjectData {
  name: string
  location: string
  projectManager: string
  projectCost?: string
}

interface ProjectManualAddModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveAndContinue: (projects: ProjectData[]) => void
  onSaveAndAddMore: (project: ProjectData) => void
  availableProjectManagers: { name: string; email: string }[]
}

export function ProjectManualAddModal({
  isOpen,
  onClose,
  onSaveAndContinue,
  onSaveAndAddMore,
  availableProjectManagers
}: ProjectManualAddModalProps) {
  const { t } = useTranslation('common')
  
  const [tempProjects, setTempProjects] = useState<ProjectData[]>([])
  const [currentProject, setCurrentProject] = useState<ProjectData>({
    name: '',
    location: '',
    projectManager: '',
    projectCost: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const validateProject = (project: ProjectData): { [key: string]: string } => {
    const newErrors: { [key: string]: string } = {}
    
    if (!project.name.trim()) {
      newErrors.name = t('admin.projectNameRequired')
    }
    
    if (!project.location.trim()) {
      newErrors.location = t('admin.projectLocationRequired')
    }
    
    return newErrors
  }

  const handleSaveAndAddMore = () => {
    const validationErrors = validateProject(currentProject)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    const newProject = { ...currentProject }
    setTempProjects(prev => [...prev, newProject])
    onSaveAndAddMore(newProject)
    
    // Reset form
    setCurrentProject({ name: '', location: '', projectManager: '', projectCost: '' })
    setErrors({})
  }

  const handleSaveAndContinue = () => {
    const validationErrors = validateProject(currentProject)
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    
    const allProjects = [...tempProjects, currentProject]
    onSaveAndContinue(allProjects)
    
    // Reset state
    setTempProjects([])
    setCurrentProject({ name: '', location: '', projectManager: '', projectCost: '' })
    setErrors({})
  }

  const handleClose = () => {
    setCurrentProject({ name: '', location: '', projectManager: '', projectCost: '' })
    setTempProjects([])
    setErrors({})
    onClose()
  }

  const removeProject = (index: number) => {
    setTempProjects(prev => prev.filter((_, i) => i !== index))
  }

  const isFormValid = currentProject.name.trim() && currentProject.location.trim()

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-full overflow-y-auto">
        <AlertDialogHeader className="relative">
          <AlertDialogTitle className="text-lg sm:text-xl pr-8">{t('admin.addProjects')}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm sm:text-base">
            {t('admin.addProjectsDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 sm:py-6">
          <div className="space-y-6">
            {tempProjects.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{tempProjects.length}</span>
                  </div>
                  <span className="font-medium">
                    {tempProjects.length} {t('admin.projectsAddedSoFar')}
                  </span>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName" className="text-sm font-medium">
                    {t('admin.projectName')} *
                  </Label>
                  <Input
                    id="projectName"
                    value={currentProject.name}
                    onChange={(e) => {
                      setCurrentProject(prev => ({ ...prev, name: e.target.value }))
                      if (errors.name) setErrors(prev => ({ ...prev, name: '' }))
                    }}
                    placeholder={t('admin.enterProjectName')}
                    className={`${errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectManager" className="text-sm font-medium">
                    {t('admin.projectManager')} <span className="text-muted-foreground"></span>
                  </Label>
                  <select
                    id="projectManager"
                    value={currentProject.projectManager}
                    onChange={(e) => setCurrentProject(prev => ({ ...prev, projectManager: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600"
                  >
                    <option value="">{t('admin.selectProjectManager')}</option>
                    {availableProjectManagers.map((manager) => (
                      <option key={manager.email} value={manager.name}>
                        {manager.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectLocation" className="text-sm font-medium">
                    {t('admin.location')} *
                  </Label>
                  <Input
                    id="projectLocation"
                    value={currentProject.location}
                    onChange={(e) => {
                      setCurrentProject(prev => ({ ...prev, location: e.target.value }))
                      if (errors.location) setErrors(prev => ({ ...prev, location: '' }))
                    }}
                    placeholder={t('admin.projectLocation')}
                    className={`${errors.location ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {errors.location && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.location}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="projectCost" className="text-sm font-medium">
                    Project Cost (Optional)
                  </Label>
                  <Input
                    id="projectCost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentProject.projectCost}
                    onChange={(e) => {
                      setCurrentProject(prev => ({ ...prev, projectCost: e.target.value }))
                    }}
                    placeholder="Enter project cost"
                  />
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
{t('admin.cancel')}
          </Button>
          
          <Button 
            onClick={handleSaveAndAddMore} 
            disabled={!isFormValid}
            variant="outline"
            className="w-full sm:w-auto order-3 sm:order-2"
          >
            <Plus className="w-4 h-4 mr-2" />
{t('admin.saveAndAddMore')}
          </Button>
          
          <Button 
            onClick={handleSaveAndContinue} 
            disabled={!isFormValid}
            className="w-full sm:w-auto order-1 sm:order-3 bg-green-600 hover:bg-green-700"
          >
{t('admin.saveAndContinue')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}