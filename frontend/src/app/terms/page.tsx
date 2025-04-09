"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GraduationCap, ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
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
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
          
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-lg text-muted-foreground mb-6">
              Last updated: April 9, 2025
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the GATE Prep application, you agree to be bound by these Terms of Service. 
              If you do not agree to these Terms, you may not access or use the application.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. User Accounts</h2>
            <p>
              To use certain features of the application, you must create an account. You are responsible for 
              maintaining the confidentiality of your account credentials and for all activities that occur under 
              your account. You agree to provide accurate and complete information when creating your account and 
              to update your information as necessary.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. User Content</h2>
            <p>
              You retain ownership of any content you submit, post, or display on or through the application. 
              By submitting, posting, or displaying content, you grant us a worldwide, non-exclusive, royalty-free 
              license to use, reproduce, modify, adapt, publish, translate, and distribute such content in connection 
              with providing and promoting the application.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Prohibited Activities</h2>
            <p>You agree not to:</p>
            <ul className="space-y-2">
              <li>Use the application for any illegal purpose or in violation of any laws</li>
              <li>Violate or infringe upon the rights of others</li>
              <li>Interfere with or disrupt the application or servers</li>
              <li>Attempt to gain unauthorized access to the application or user accounts</li>
              <li>Use the application in any manner that could damage, disable, overburden, or impair it</li>
              <li>Share your account credentials with others or allow others to use your account</li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Intellectual Property</h2>
            <p>
              The application and its original content, features, and functionality are owned by GATE Prep and 
              are protected by international copyright, trademark, patent, trade secret, and other intellectual 
              property or proprietary rights laws.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Third-Party Links and Services</h2>
            <p>
              The application may contain links to third-party websites or services that are not owned or controlled 
              by GATE Prep. We have no control over, and assume no responsibility for, the content, privacy policies, 
              or practices of any third-party websites or services.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Termination</h2>
            <p>
              We may terminate or suspend your account and access to the application immediately, without prior 
              notice or liability, for any reason, including without limitation if you breach these Terms of Service.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Disclaimer of Warranties</h2>
            <p>
              The application is provided on an "as is" and "as available" basis. GATE Prep makes no warranties, 
              expressed or implied, regarding the operation or availability of the application, or that it will 
              be uninterrupted or error-free.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Limitation of Liability</h2>
            <p>
              In no event shall GATE Prep, its directors, employees, partners, agents, suppliers, or affiliates 
              be liable for any indirect, incidental, special, consequential, or punitive damages, including 
              without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from 
              your access to or use of or inability to access or use the application.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Changes to Terms</h2>
            <p>
              We reserve the right to modify or replace these Terms at any time. It is your responsibility to 
              review these Terms periodically for changes. Your continued use of the application following the 
              posting of any changes constitutes acceptance of those changes.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at 
              <a href="mailto:terms@gateprep.app" className="text-primary"> terms@gateprep.app</a>.
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