"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GraduationCap, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-lg text-muted-foreground mb-6">
              Last updated: April 9, 2025
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Introduction</h2>
            <p>
              At GATE Prep, we respect your privacy and are committed to protecting your personal information. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when 
              you use our web application.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Information We Collect</h2>
            <p>We collect the following types of information:</p>
            <ul className="space-y-2">
              <li>
                <strong>Personal Information:</strong> Name, email address, and other information you provide 
                when creating an account or updating your profile.
              </li>
              <li>
                <strong>Usage Data:</strong> Information about how you interact with our application, including 
                study sessions, quiz scores, and progress data.
              </li>
              <li>
                <strong>Device Information:</strong> Information about your device and internet connection, 
                including IP address, browser type, and operating system.
              </li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Create and manage your account</li>
              <li>Generate personalized study plans</li>
              <li>Track your progress and provide analytics</li>
              <li>Communicate with you about updates and features</li>
              <li>Respond to your inquiries and support requests</li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information from unauthorized 
              access, alteration, disclosure, or destruction. However, no internet transmission is 100% secure, 
              and we cannot guarantee the security of information transmitted through our application.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Third-Party Services</h2>
            <p>
              We may use third-party services to help us operate our application or administer activities on our 
              behalf. These third parties have access to your personal information only to perform these tasks 
              on our behalf and are obligated not to disclose or use it for any other purpose.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="space-y-2">
              <li>Access and receive a copy of your personal data</li>
              <li>Rectify inaccurate or incomplete personal data</li>
              <li>Request deletion of your personal data</li>
              <li>Object to or restrict the processing of your personal data</li>
              <li>Receive your personal data in a structured, commonly used format</li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Changes to This Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting 
              the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at 
              <a href="mailto:mayank@gateprep.app" className="text-primary"> mayank@gateprep.app</a>.
            </p>
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