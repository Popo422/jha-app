'use client'

import AdminProtectedRoute from '@/components/AdminProtectedRoute'

export default function WorkerCompPage() {
  return (
    <AdminProtectedRoute>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Worker Comp</h1>
        <p className="text-gray-600">Worker compensation management coming soon...</p>
      </div>
    </AdminProtectedRoute>
  )
}