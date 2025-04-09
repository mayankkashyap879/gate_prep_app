"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, BarChart, BookCheck, FileText } from 'lucide-react';
import { isAuthenticated } from "@/lib/api";

export default function LandingPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  
  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = () => {
      const loggedIn = isAuthenticated();
      setIsUserLoggedIn(loggedIn);
      setIsCheckingAuth(false);
      
      if (loggedIn) {
        router.push('/dashboard');
      }
    };
    
    checkAuth();
  }, [router]);

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Don't show landing page content if user is logged in (will be redirected)
  if (isUserLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <header className="bg-gradient-to-b from-primary/10 to-background">
        <div className="container px-4 py-8 mx-auto">
          <nav className="flex justify-between items-center mb-16">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-primary" />
              <span className="font-bold text-lg">GATE Prep</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button>Get Started</Button>
              </Link>
            </div>
          </nav>
          
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Your Personal GATE Exam Companion
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Master the entire GATE syllabus with our comprehensive study planner, 
              quizzes, practice tests, and progress tracking system.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="px-8">Get Started Free</Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline">See Features</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container px-4 mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Built for GATE Success</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="bg-card border rounded-lg p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <BookCheck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-medium mb-2">Smart Scheduling</h3>
              <p className="text-muted-foreground">
                Automatically generates a study plan based on your exam deadline and the GATE CS syllabus.
              </p>
            </div>
            
            <div className="bg-card border rounded-lg p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-medium mb-2">Interactive Quizzes</h3>
              <p className="text-muted-foreground">
                Practice with topic-wise quizzes from GateOverflow to solidify your understanding of key concepts.
              </p>
            </div>
            
            <div className="bg-card border rounded-lg p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-medium mb-2">Mock Tests</h3>
              <p className="text-muted-foreground">
                Take full-length practice tests to simulate the actual GATE exam experience and identify areas for improvement.
              </p>
            </div>
            
            <div className="bg-card border rounded-lg p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <BarChart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-medium mb-2">Progress Tracking</h3>
              <p className="text-muted-foreground">
                Track your progress through each subject and topic with detailed analytics and reports.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Call to Action */}
      <section className="bg-muted py-20">
        <div className="container px-4 mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Start Your GATE Preparation?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of students who have improved their GATE scores using our structured 
            approach to exam preparation.
          </p>
          <Link href="/login">
            <Button size="lg" className="px-8">Create Account</Button>
          </Link>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t py-8 mt-auto">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <GraduationCap className="h-6 w-6 text-primary" />
              <span className="font-bold">GATE Prep</span>
            </div>
            <div className="flex gap-8 mb-4 md:mb-0">
              <Link href="/about" className="text-sm hover:text-primary">About</Link>
              <Link href="/privacy" className="text-sm hover:text-primary">Privacy Policy</Link>
              <Link href="/terms" className="text-sm hover:text-primary">Terms of Service</Link>
            </div>
            <div className="text-sm text-muted-foreground">
              Created by Mayank Kashyap using Claude AI. © 2025 GATE Prep App.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}