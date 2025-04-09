"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import { setToken } from "@/lib/api";

// Content component that uses searchParams
function AuthLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoggedIn, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Handle OAuth callback from URL params
  useEffect(() => {
    if (searchParams && searchParams.has('token')) {
      const token = searchParams.get('token');
      if (token) {
        try {
          // Save token and inform user
          setToken(token);
          toast.success("Successfully signed in with Google!");
          
          // Redirect to dashboard after token is set
          router.push('/dashboard');
        } catch (error) {
          console.error('Error processing token:', error);
          toast.error("Authentication failed. Please try again.");
          router.push('/login');
        }
      }
    }
    
    // Handle OAuth errors from query params
    if (searchParams && searchParams.has('error')) {
      const error = searchParams.get('error');
      if (error === 'auth_failed') {
        toast.error("Google authentication failed. Please try again.");
      } else if (error === 'no_user') {
        toast.error("No user found. Please try again.");
      } else if (error === 'token_error') {
        toast.error("Error generating authentication token. Please try again.");
      }
    }
  }, [searchParams, router]);
  
  // Redirect to dashboard if already logged in (do this inside useEffect)
  useEffect(() => {
    if (!loading && isLoggedIn) {
      router.push('/dashboard');
    }
  }, [loading, isLoggedIn, router]);
  
  // Show a loading spinner while checking authentication
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
  
  // Once loading is done and if not logged in, render the auth layout UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold">GATE Prep App</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your personalized study companion for GATE exam preparation
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

// Wrap the content component in a suspense boundary
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <AuthLayoutContent>{children}</AuthLayoutContent>
    </Suspense>
  );
}