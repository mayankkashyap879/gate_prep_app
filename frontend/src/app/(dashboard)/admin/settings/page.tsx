"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Save } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { Separator } from "@/components/ui/separator";

export default function AdminSettingsPage() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  
  const [googleSettings, setGoogleSettings] = useState({
    googleClientId: "",
    googleClientSecret: "",
    googleCallbackUrl: ""
  });
  
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    // Check if user is admin, if not, redirect to dashboard
    if (!loading && !isAdmin) {
      toast.error("You do not have permission to access this page");
      router.push("/dashboard");
    }
    
    // Fetch current OAuth settings
    const fetchOAuthSettings = async () => {
      try {
        // In a real implementation, you would fetch from your backend
        // For now, we'll use localStorage as a placeholder
        const settings = localStorage.getItem('google_oauth_settings');
        if (settings) {
          setGoogleSettings(JSON.parse(settings));
        }
      } catch (error) {
        console.error("Error fetching OAuth settings:", error);
      }
    };
    
    fetchOAuthSettings();
  }, [isAdmin, loading, router]);
  
  const handleGoogleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setGoogleSettings((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  const saveGoogleSettings = async () => {
    setIsSaving(true);
    try {
      // In a real implementation, you would send to your backend
      // For now, we'll use localStorage as a placeholder
      localStorage.setItem('google_oauth_settings', JSON.stringify(googleSettings));
      
      toast.success("Google OAuth settings saved successfully");
    } catch (error) {
      console.error("Error saving OAuth settings:", error);
      toast.error("Failed to save Google OAuth settings");
    } finally {
      setIsSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Settings</h1>
      </div>
      
      <Tabs defaultValue="oauth">
        <TabsList>
          <TabsTrigger value="oauth">OAuth Settings</TabsTrigger>
          {/* Add more tabs as needed */}
        </TabsList>
        
        <TabsContent value="oauth" className="mt-4 space-y-4">
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              These settings are crucial for Google authentication to work properly. After changes, restart the server for new settings to take effect.
            </AlertDescription>
          </Alert>
          
          <Card>
            <CardHeader>
              <CardTitle>Google OAuth Configuration</CardTitle>
              <CardDescription>Configure Google authentication credentials.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="googleClientId">Google Client ID</Label>
                <Input
                  id="googleClientId"
                  name="googleClientId"
                  value={googleSettings.googleClientId}
                  onChange={handleGoogleSettingsChange}
                  placeholder="Your Google OAuth Client ID"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="googleClientSecret">Google Client Secret</Label>
                <Input
                  id="googleClientSecret"
                  name="googleClientSecret"
                  type="password"
                  value={googleSettings.googleClientSecret}
                  onChange={handleGoogleSettingsChange}
                  placeholder="Your Google OAuth Client Secret"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="googleCallbackUrl">Callback URL</Label>
                <Input
                  id="googleCallbackUrl"
                  name="googleCallbackUrl"
                  value={googleSettings.googleCallbackUrl}
                  onChange={handleGoogleSettingsChange}
                  placeholder="https://your-domain.com/api/auth/google/callback"
                />
                <p className="text-xs text-muted-foreground">
                  This URL must be registered in your Google API Console.
                </p>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <h3 className="font-medium">How to obtain Google OAuth credentials:</h3>
                <ol className="text-sm text-muted-foreground pl-5 space-y-1 list-decimal">
                  <li>Go to the <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a></li>
                  <li>Create a new project or select an existing one</li>
                  <li>Navigate to "APIs & Services" &gt; "Credentials"</li>
                  <li>Click "Create Credentials" &gt; "OAuth client ID"</li>
                  <li>Set application type to "Web application"</li>
                  <li>Add your app's callback URL to "Authorized redirect URIs"</li>
                  <li>Copy the Client ID and Client Secret provided</li>
                </ol>
              </div>
              
              <Button
                onClick={saveGoogleSettings}
                disabled={isSaving}
                className="mt-4"
              >
                {isSaving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save OAuth Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}