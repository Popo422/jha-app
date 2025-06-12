'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import AppSidebar from '@/components/AppSidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function EndOfDayReportPage() {
  const [formData, setFormData] = useState({
    date: '',
    shift: '',
    workCompleted: '',
    hoursWorked: '',
    incidents: '',
    equipmentUsed: '',
    materialsUsed: '',
    tomorrowPlan: '',
    notes: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('End of Day Report submitted:', formData)
    // Handle form submission here
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <AppSidebar />
      
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/contractor-forms">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Forms
              </Link>
            </Button>
            <h1 className="text-3xl font-bold text-foreground">End of Day Report</h1>
          </div>
          
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-foreground">Daily Completion Summary</CardTitle>
            </CardHeader>
            {/* <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="shift">Shift</Label>
                    <select
                      id="shift"
                      name="shift"
                      value={formData.shift}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    >
                      <option value="">Select shift</option>
                      <option value="day">Day Shift</option>
                      <option value="night">Night Shift</option>
                      <option value="weekend">Weekend</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="hoursWorked">Total Hours Worked</Label>
                    <Input
                      id="hoursWorked"
                      name="hoursWorked"
                      type="number"
                      step="0.5"
                      value={formData.hoursWorked}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workCompleted">Work Completed Today</Label>
                  <Textarea
                    id="workCompleted"
                    name="workCompleted"
                    value={formData.workCompleted}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Describe the work that was completed today..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="incidents">Incidents or Safety Concerns</Label>
                  <Textarea
                    id="incidents"
                    name="incidents"
                    value={formData.incidents}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Report any incidents, near misses, or safety concerns (write 'None' if no incidents)..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipmentUsed">Equipment Used</Label>
                  <Textarea
                    id="equipmentUsed"
                    name="equipmentUsed"
                    value={formData.equipmentUsed}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="List equipment used and any maintenance needed..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="materialsUsed">Materials Used</Label>
                  <Textarea
                    id="materialsUsed"
                    name="materialsUsed"
                    value={formData.materialsUsed}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="List materials consumed and quantities..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tomorrowPlan">Tomorrow's Plan</Label>
                  <Textarea
                    id="tomorrowPlan"
                    name="tomorrowPlan"
                    value={formData.tomorrowPlan}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="What is planned for tomorrow..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Any additional notes or comments..."
                  />
                </div>

                <div className="flex gap-4">
                  <Button 
                    type="submit"
                    className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                  >
                    Submit Report
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/contractor-forms">Cancel</Link>
                  </Button>
                </div>
              </form>
            </CardContent> */}
          </Card>
        </div>
      </main>
    </div>
  )
}