"use client";

import Header from "@/components/Header";
import AppSidebar from "@/components/AppSidebar";
import { SubmissionsTable } from "@/components/SubmissionsTable";
import { useGetSubmissionsQuery } from "@/lib/features/submissions/submissionsApi";

export default function MySubmissionsPage() {
  const { data, isLoading, error, refetch } = useGetSubmissionsQuery({ authType: 'contractor' });

  const handleDelete = (id: string) => {
    refetch();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AppSidebar />

      <main className="p-2 md:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-center">My Submissions</h1>

          {error ? (
            <div className="bg-card text-card-foreground rounded-lg border p-6">
              <p className="text-destructive">Error loading submissions. Please try again later.</p>
            </div>
          ) : (
            <SubmissionsTable 
              data={data?.submissions || []} 
              isLoading={isLoading} 
              onDelete={handleDelete}
            />
          )}
        </div>
      </main>
    </div>
  );
}
