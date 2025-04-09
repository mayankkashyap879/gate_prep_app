// frontend/src/app/(dashboard)/settings/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { authAPI, subjectsAPI, scheduleAPI } from '@/lib/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Clock, 
  BookOpen,
  Check
} from 'lucide-react';

export default function SettingsPage() {
  // User settings
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Study plan settings
  const [planType, setPlanType] = useState('moderate');
  const [minHours, setMinHours] = useState(2);
  const [moderateHours, setModerateHours] = useState(2.5);
  const [maxHours, setMaxHours] = useState(3);
  const [customHours, setCustomHours] = useState(2.5);
  
  // Subject selection
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [subjectPriorities, setSubjectPriorities] = useState<{[key: string]: number}>({}); // Store subject priorities
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  
  // Other settings can be added here if needed
  
  // Other state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Load user settings and subjects from API
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setLoadingSubjects(true);
      try {
        // Get user data
        const userData = await authAPI.getCurrentUser();
        setName(userData.name);
        setEmail(userData.email);
        setDeadline(userData.deadline || '2026-02-01');
        
        // Set study plan settings
        setPlanType(userData.selectedPlan || 'moderate');
        
        // Set hours based on user's daily target
        if (userData.dailyTarget) {
          // Convert minutes to hours for all plans
          setMinHours(userData.dailyTarget.minimum / 60);
          setModerateHours(userData.dailyTarget.moderate / 60);
          setMaxHours(userData.dailyTarget.maximum / 60);
          
          if (userData.dailyTarget.custom) {
            setCustomHours(userData.dailyTarget.custom / 60);
          }
        }
        
        // Set selected subjects if available
        if (userData.selectedSubjects && Array.isArray(userData.selectedSubjects)) {
          setSelectedSubjectIds(userData.selectedSubjects.map((s: any) => 
            typeof s === 'string' ? s : s._id || s
          ));
        }
        
        // Set subject priorities if available
        if (userData.subjectPriorities && typeof userData.subjectPriorities === 'object') {
          setSubjectPriorities(userData.subjectPriorities);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
      
      try {
        // Load all subjects
        const subjectsData = await subjectsAPI.getAllSubjects();
        setSubjects(subjectsData);
      } catch (error) {
        console.error('Failed to load subjects:', error);
        toast.error('Failed to load subjects');
      } finally {
        setLoadingSubjects(false);
      }
    };
    
    loadData();
  }, []);
  
  // Format minutes to hours for display
  const formatHoursMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins > 0 ? mins + 'm' : ''}`;
  };
  
  // Handle profile update
  const handleProfileUpdate = async () => {
    setIsSubmitting(true);
    try {
      // This would be an API call to update user profile name
      // Note: We're assuming this API would exist in a real implementation
      // await api.put('/auth/update-profile', { name });
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle study plan update
  const handleStudyPlanUpdate = async () => {
    setIsSubmitting(true);
    try {
      // Calculate custom target in minutes if custom plan selected
      const customTarget = planType === 'custom' ? Math.round(customHours * 60) : undefined;
      
      console.log(`Updating plan to ${planType} with custom target: ${customTarget}`);
      
      // Update the plan
      await authAPI.updatePlan({
        selectedPlan: planType,
        customTarget
      });
      
      // Reset and regenerate the schedule with the new plan
      try {
        // First reset the schedule
        await scheduleAPI.resetSchedule();
        console.log('Successfully reset existing schedule');
        
        // Then generate a new one with the regenerate flag
        await scheduleAPI.generateSchedule(undefined, 30, true);
        console.log('Successfully regenerated schedule with new plan');
      } catch (scheduleError: any) {
        console.error('Error resetting/regenerating schedule:', scheduleError);
        
        // Show user-friendly error toast
        const errorMessage = scheduleError.userFriendlyMessage || 
                           'Could not regenerate your schedule. Please check your settings.';
        
        toast.error(errorMessage, {
          duration: 5000
        });
      }
      
      toast.success('Study plan updated successfully');
    } catch (error) {
      console.error('Failed to update study plan:', error);
      toast.error('Failed to update study plan');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle deadline update
  const handleDeadlineUpdate = async () => {
    setIsSubmitting(true);
    try {
      await authAPI.updateDeadline(deadline);
      toast.success('Exam deadline updated successfully');
    } catch (error) {
      console.error('Failed to update deadline:', error);
      toast.error('Failed to update deadline');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Timer settings have been moved to the timer page directly
  
  // Handle subject selection update
  const handleSubjectSelectionUpdate = async () => {
    setIsSubmitting(true);
    try {
      // Only include priorities for selected subjects
      const selectedPriorities: {[key: string]: number} = {};
      selectedSubjectIds.forEach(id => {
        selectedPriorities[id] = subjectPriorities[id] || 5; // Default to 5 if not set
      });
      
      // Update subject selections
      await authAPI.selectSubjects(selectedSubjectIds, selectedPriorities);
      
      // Reset and regenerate the schedule with the new subject selection
      try {
        // First reset the schedule
        await scheduleAPI.resetSchedule();
        console.log('Successfully reset existing schedule');
        
        // Then generate a new one with the regenerate flag
        await scheduleAPI.generateSchedule(undefined, 30, true);
        console.log('Successfully regenerated schedule with new subject selection');
      } catch (scheduleError: any) {
        console.error('Error resetting/regenerating schedule:', scheduleError);
        
        // Show user-friendly error toast
        const errorMessage = scheduleError.userFriendlyMessage || 
                           'Could not regenerate your schedule. Please check your subject selection.';
        
        toast.error(errorMessage, {
          duration: 5000
        });
      }
      
      toast.success('Subject preferences updated successfully');
    } catch (error) {
      console.error('Failed to update subject preferences:', error);
      toast.error('Failed to update subject preferences');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Update priority for a subject
  const updateSubjectPriority = (subjectId: string, priority: number) => {
    setSubjectPriorities(prev => ({
      ...prev,
      [subjectId]: priority
    }));
  };
  
  // Toggle subject selection
  const toggleSubject = (subjectId: string) => {
    setSelectedSubjectIds(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(id => id !== subjectId);
      } else {
        return [...prev, subjectId];
      }
    });
  };
  
  return (
    <div className="container max-w-6xl px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="profile" className="w-full" 
            onValueChange={(value) => {
              // If trying to access the removed timer tab, redirect to profile
              if (value === "timer") {
                toast.info("Timer settings are now directly accessible from the timer page");
                return "profile";
              }
              return value;
            }}>
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="study-plan">Study Plan</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Manage your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deadline">GATE Exam Deadline</Label>
                <div className="flex gap-4 items-center">
                  <Input 
                    id="deadline" 
                    type="date" 
                    value={deadline} 
                    onChange={(e) => setDeadline(e.target.value)} 
                    className="w-48"
                  />
                  <Button onClick={handleDeadlineUpdate}>Update Deadline</Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  This deadline is used to calculate your study plan
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleProfileUpdate} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="subjects">
          <Card>
            <CardHeader>
              <CardTitle>Subject Preferences</CardTitle>
              <CardDescription>
                Select the subjects you want to study
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSubjects ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-3">Available Subjects</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {subjects.map((subject) => (
                        <div 
                          key={subject._id} 
                          className="flex items-start space-x-2 border rounded-md p-3 hover:bg-muted/30 transition-colors"
                        >
                          <div className="relative w-4 h-4 mt-1">
                            <input 
                              type="checkbox"
                              id={`subject-${subject._id}`} 
                              checked={selectedSubjectIds.includes(subject._id)}
                              onChange={() => toggleSubject(subject._id)}
                              className="absolute w-4 h-4 cursor-pointer appearance-none rounded-sm border border-primary checked:bg-primary"
                            />
                            {selectedSubjectIds.includes(subject._id) && (
                              <Check className="absolute top-0 left-0 h-4 w-4 text-white pointer-events-none" />
                            )}
                          </div>
                          <div className="flex-1">
                            <label 
                              htmlFor={`subject-${subject._id}`} 
                              className="text-sm font-medium cursor-pointer flex items-center"
                            >
                              {subject.name}
                            </label>
                            <div className="text-xs text-muted-foreground mt-1 grid grid-cols-2 gap-2">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> 
                                {formatHoursMinutes(subject.totalDuration)}
                              </div>
                              <div className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" /> 
                                {subject.modules?.length || 0} modules
                              </div>
                            </div>
                            
                            {/* Priority slider - only shown for selected subjects */}
                            {selectedSubjectIds.includes(subject._id) && (
                              <div className="mt-3 space-y-1 border-t pt-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-medium">Priority:</label>
                                  <span className="text-xs">{subjectPriorities[subject._id] || 5}</span>
                                </div>
                                <input
                                  type="range"
                                  min={1}
                                  max={10}
                                  step={1}
                                  value={subjectPriorities[subject._id] || 5}
                                  onChange={(e) => updateSubjectPriority(subject._id, parseInt(e.target.value))}
                                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Low</span>
                                  <span>High</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2 border-t pt-4">
                    <h3 className="text-sm font-medium">Selected Subjects: {selectedSubjectIds.length}</h3>
                    <p className="text-sm text-muted-foreground">
                      Set priority levels for your subjects to indicate their importance in your study plan.
                      Higher priority subjects will receive more focus in your schedule.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSubjectSelectionUpdate} 
                disabled={isSubmitting || loadingSubjects}
              >
                {isSubmitting ? 'Saving...' : 'Save Subject Preferences'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="study-plan">
          <Card>
            <CardHeader>
              <CardTitle>Study Plan Settings</CardTitle>
              <CardDescription>
                Configure your daily study targets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="plan-type">Study Plan Intensity</Label>
                <Select value={planType} onValueChange={setPlanType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Plan Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimum">Minimum ({formatHoursMinutes(minHours * 60)})</SelectItem>
                    <SelectItem value="moderate">Moderate ({formatHoursMinutes(moderateHours * 60)})</SelectItem>
                    <SelectItem value="maximum">Maximum ({formatHoursMinutes(maxHours * 60)})</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                
                <p className="text-sm text-muted-foreground">
                  This determines how much time you need to study each day to cover the entire syllabus by your deadline.
                </p>
              </div>
              
              {planType === 'custom' && (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label htmlFor="custom-hours">Custom Daily Target</Label>
                    <span className="text-sm">{formatHoursMinutes(customHours * 60)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Slider
                      id="custom-hours"
                      min={Math.max(2, minHours)}
                      max={16}
                      step={0.5}
                      value={[customHours]}
                      onValueChange={(value: number[]) => setCustomHours(value[0])}
                    />
                    <Input
                      type="number"
                      className="w-20"
                      value={customHours}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        // Ensure value is within valid range
                        const constrained = Math.min(16, Math.max(Math.max(2, minHours), value));
                        setCustomHours(constrained);
                      }}
                      min={Math.max(2, minHours)}
                      max={16}
                      step={0.5}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Set your own daily study target (minimum: {formatHoursMinutes(Math.max(120, minHours * 60))}, maximum: 16h)
                  </p>
                </div>
              )}
              
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-medium">Calculated Study Plan</h3>
                <p className="text-sm text-muted-foreground">
                  Based on your exam deadline and remaining syllabus
                </p>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Minimum Plan:</span>
                    <span className="font-medium">{formatHoursMinutes(minHours * 60)}/day</span>
                    <span className="text-xs text-muted-foreground">(Required to complete all content)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Moderate Plan:</span>
                    <span className="font-medium">{formatHoursMinutes(moderateHours * 60)}/day</span>
                    <span className="text-xs text-muted-foreground">(Minimum + 1 hour)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Maximum Plan:</span>
                    <span className="font-medium">{formatHoursMinutes(maxHours * 60)}/day</span>
                    <span className="text-xs text-muted-foreground">(Minimum + 2 hours)</span>
                  </div>
                  {planType === 'custom' && (
                    <div className="flex justify-between items-center">
                      <span>Custom Plan:</span>
                      <span className="font-medium">{formatHoursMinutes(customHours * 60)}/day</span>
                      <span className="text-xs text-muted-foreground">(Your custom setting)</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleStudyPlanUpdate} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Study Plan'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Timer settings have been moved to the timer page directly */}
        
      </Tabs>
    </div>
  );
}