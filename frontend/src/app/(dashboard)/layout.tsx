// frontend/src/app/(dashboard)/layout.tsx
"use client";

import React from 'react';
import { Sidebar } from '@/components/navigation/Sidebar';
import Navbar from '@/components/navigation/Navbar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/providers/auth-provider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoggedIn, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Fixed width sidebar */}
      <div className="w-64 flex-shrink-0">
        <Sidebar />
      </div>
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <ScrollArea className="flex-1">
          <main className="flex-1 bg-muted/20 p-4 md:p-6">
            {children}
          </main>
        </ScrollArea>
      </div>
    </div>
  );
}