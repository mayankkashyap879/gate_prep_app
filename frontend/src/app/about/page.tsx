"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GraduationCap, ArrowLeft } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="border-b">
        <div className="container px-4 py-4 mx-auto">
          <nav className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              <span className="font-bold">GATE Prep</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back to Home
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1">
        <div className="container px-4 py-12 mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold mb-8">About GATE Prep</h1>
          
          <div className="prose dark:prose-invert max-w-none">
            <p className="lead mb-6 text-xl text-muted-foreground">
              GATE Prep is a comprehensive study planning and progress tracking platform specifically designed 
              for GATE CS/IT exam preparation.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
            <p>
              Our mission is to provide GATE aspirants with a structured approach to exam preparation that helps them 
              study efficiently, track their progress, and ultimately achieve better scores in the GATE Computer Science 
              and Information Technology examination.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Key Features</h2>
            <ul className="space-y-2">
              <li>
                <strong>Personalized Study Planner:</strong> Generate a customized study plan based on your exam 
                deadline and track your progress.
              </li>
              <li>
                <strong>Interactive Quizzes:</strong> Practice with topic-wise quizzes from GateOverflow to solidify 
                your understanding of key concepts.
              </li>
              <li>
                <strong>Mock Tests:</strong> Take full-length practice tests to simulate the actual GATE exam 
                experience and identify areas for improvement.
              </li>
              <li>
                <strong>Progress Analytics:</strong> Track your progress across subjects and topics with 
                detailed performance analytics.
              </li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">The Team</h2>
            <p>
              GATE Prep was created by Mayank Kashyap, a passionate educator and technologist committed to 
              making GATE preparation more efficient and accessible for all students.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Get Started</h2>
            <p>
              Ready to begin your GATE preparation journey? Create your free account today and start using 
              our tools to boost your exam preparation.
            </p>
            
            <div className="mt-8">
              <Link href="/login">
                <Button size="lg">Create Account</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="font-bold">GATE Prep</span>
            </div>
            <div className="flex gap-8 mb-4 md:mb-0">
              <Link href="/about" className="text-sm hover:text-primary">About</Link>
              <Link href="/privacy" className="text-sm hover:text-primary">Privacy Policy</Link>
              <Link href="/terms" className="text-sm hover:text-primary">Terms of Service</Link>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2025 GATE Prep App.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}