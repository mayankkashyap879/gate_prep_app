"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/api";
import { toast } from "sonner";

export default function AuthSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Extract the token once.
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      setToken(token);
      toast.success("Successfully authenticated with Google!");

      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } else {
      toast.error("Authentication failed - no token received");
      router.push('/login');
    }
  }, [router, token]); // <-- use token instead of searchParams

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Authentication Successful</h1>
        <p className="text-muted-foreground">
          You have successfully authenticated with Google.
        </p>
      </div>
      
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      
      <p className="mt-6 text-sm text-muted-foreground">
        Redirecting to dashboard...
      </p>
    </div>
  );
}
