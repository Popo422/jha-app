interface SubmissionData {
  submissionType: 'end-of-day' | 'job-hazard-analysis' | 'start-of-day' | 'incident-report' | 'quick-incident-report'
  projectName: string
  supervisorDateClockedIn?: string
  supervisorDateClockedOut?: string
  formData: Record<string, any>
  files?: File[]
}

interface SubmissionResponse {
  success: boolean
  submission?: any
  error?: string
}

export async function submitForm(data: SubmissionData): Promise<SubmissionResponse> {
  try {
    const formData = new FormData()
    
    // Add form fields
    formData.append('submissionType', data.submissionType)
    formData.append('projectName', data.projectName)
    formData.append('formData', JSON.stringify(data.formData))
    
    if (data.supervisorDateClockedIn) {
      formData.append('supervisorDateClockedIn', data.supervisorDateClockedIn)
    }
    
    if (data.supervisorDateClockedOut) {
      formData.append('supervisorDateClockedOut', data.supervisorDateClockedOut)
    }
    
    // Add files if any
    if (data.files) {
      data.files.forEach(file => {
        formData.append('files', file)
      })
    }
    
    const response = await fetch('/api/submissions', {
      method: 'POST',
      body: formData,
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Submission failed')
    }
    
    return result
  } catch (error) {
    console.error('Form submission error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }
  }
}

export async function getSubmissions(type?: string, limit = 50, offset = 0) {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })
    
    if (type) {
      params.append('type', type)
    }
    
    const response = await fetch(`/api/submissions?${params}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch submissions')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Get submissions error:', error)
    throw error
  }
}