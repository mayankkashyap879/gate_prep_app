// frontend/src/components/navigation/Navbar.tsx
"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { ModeToggle } from '@/components/ui/mode-toggle';

const Navbar = () => {
  const pathname = usePathname();
  
  // Function to get page title from pathname
  const getPageTitle = (path: string): string => {
    // Remove leading slash and take the first segment
    const segment = path.split('/')[1];
    
    // If it's the dashboard, return 'Dashboard', otherwise capitalize first letter
    if (segment === 'dashboard' || !segment) {
      return 'Dashboard';
    }
    
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <div className="border-b bg-background">
      <div className="flex h-16 items-center justify-between px-4">
        <div>
          <h1 className="text-xl font-semibold">{getPageTitle(pathname)}</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <ModeToggle />
        </div>
      </div>
    </div>
  );
};

export default Navbar;