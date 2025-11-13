// Utility function to fetch project location for PDFs
export async function getProjectLocation(projectName: string): Promise<string> {
  try {
    if (!projectName?.trim()) {
      return ''
    }

    const response = await fetch(`/api/admin/projects/location?projectName=${encodeURIComponent(projectName.trim())}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
    })

    if (!response.ok) {
      console.warn(`Failed to fetch project location for "${projectName}":`, response.status, response.statusText)
      return ''
    }

    const data = await response.json()
    return data.project?.location || ''
  } catch (error) {
    console.warn(`Error fetching project location for "${projectName}":`, error)
    return ''
  }
}