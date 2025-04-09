// frontend/src/app/(dashboard)/dashboard/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  BarChart3, 
  Award
} from 'lucide-react';
// Removed Pomodoro timer import
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';
import { format, differenceInDays } from 'date-fns';
import { scheduleAPI, studySessionAPI } from '@/lib/api';

interface SessionItem {
  id: string;
  type: 'lecture' | 'quiz' | 'homework' | 'pyq';
  name: string;
  moduleName: string;
  subjectName: string;
  duration: number;
  completed: boolean;
}

interface DailySchedule {
  date: string;
  plannedSessions: SessionItem[];
  totalPlannedDuration: number;
  totalCompletedDuration: number;
  percentCompleted: number;
}

interface StudyStats {
  streak: number;
  totalHours: number;
  dailyGoal: number;
  dailyProgress: number;
  dailyTarget: number;
}

const Dashboard = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeSession, setActiveSession] = useState<SessionItem | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<DailySchedule>({
    date: new Date().toLocaleDateString(),
    plannedSessions: [],
    totalPlannedDuration: 0,
    totalCompletedDuration: 0,
    percentCompleted: 0
  });
  const [stats, setStats] = useState<StudyStats>({
    streak: 0,
    totalHours: 0,
    dailyGoal: 0,
    dailyProgress: 0,
    dailyTarget: 100
  });
  const [isLoading, setIsLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  // Calculate days remaining until deadline
  useEffect(() => {
    try {
      if (user && user.deadline) {
        const deadline = new Date(user.deadline);
        const today = new Date();
        
        // Validate if deadline date is valid
        if (isNaN(deadline.getTime())) {
          console.error("Invalid deadline format:", user.deadline);
          setDaysRemaining(null);
          return;
        }
        
        const daysDiff = differenceInDays(deadline, today);
        setDaysRemaining(daysDiff > 0 ? daysDiff : 0);
      } else {
        setDaysRemaining(null);
      }
    } catch (error) {
      console.error("Error calculating days remaining:", error);
      setDaysRemaining(null);
    }
  }, [user]);

  // Fetch today's schedule and user stats
  useEffect(() => {
    // Wait for user data to be loaded
    if (authLoading) return;
    
    const fetchTodaySchedule = async () => {
      setIsLoading(true);
      try {
        // Format today's date for API
        const today = new Date();
        const dateFormatted = format(today, 'yyyy-MM-dd');
        
        // Fetch today's schedule with error handling
        let scheduleData = null;
        try {
          scheduleData = await scheduleAPI.getScheduleForDate(dateFormatted);
        } catch (scheduleError) {
          console.error("Error fetching schedule for date:", scheduleError);
          scheduleData = null;
        }
        
        // Process schedule data if available
        if (scheduleData && scheduleData.plannedSessions && Array.isArray(scheduleData.plannedSessions)) {
          try {
            // Map data to match our interface with error handling for each session
            const mappedSessions = scheduleData.plannedSessions
              .filter((session: any) => session !== null && typeof session === 'object')
              .map((session: any) => ({
                id: session._id || session.itemId || `session-${Math.random()}`,
                type: session.type || 'lecture',
                name: session.name || 'Study Session',
                moduleName: session.moduleName || '',
                subjectName: session.subjectName || '',
                duration: typeof session.duration === 'number' ? session.duration : 0,
                completed: Boolean(session.completed)
              }));
            
            // Calculate safe values for schedule metrics
            const totalPlannedDuration = typeof scheduleData.totalPlannedDuration === 'number' 
              ? scheduleData.totalPlannedDuration 
              : mappedSessions.reduce((sum: number, s: any) => sum + s.duration, 0);
              
            const totalCompletedDuration = typeof scheduleData.totalCompletedDuration === 'number'
              ? scheduleData.totalCompletedDuration
              : mappedSessions.filter((s: any) => s.completed).reduce((sum: number, s: any) => sum + s.duration, 0);
            
            // Calculate percentage with safety check for division by zero
            let percentCompleted = 0;
            if (totalPlannedDuration > 0) {
              percentCompleted = Math.round((totalCompletedDuration / totalPlannedDuration) * 100);
              // Ensure percentage is within bounds
              percentCompleted = Math.max(0, Math.min(100, percentCompleted));
            }
            
            const dailySchedule: DailySchedule = {
              date: today.toLocaleDateString(),
              plannedSessions: mappedSessions,
              totalPlannedDuration,
              totalCompletedDuration,
              percentCompleted
            };
            
            setTodaySchedule(dailySchedule);
          } catch (mappingError) {
            console.error("Error mapping schedule data:", mappingError);
            // Continue to default empty schedule
            setTodaySchedule({
              date: today.toLocaleDateString(),
              plannedSessions: [],
              totalPlannedDuration: 0,
              totalCompletedDuration: 0,
              percentCompleted: 0
            });
          }
        } else {
          console.log("No valid schedule data found, will try generating new schedule");
          
          // Set empty schedule
          setTodaySchedule({
            date: today.toLocaleDateString(),
            plannedSessions: [],
            totalPlannedDuration: 0,
            totalCompletedDuration: 0,
            percentCompleted: 0
          });
          
          // If no schedule exists, try to generate one automatically
          try {
            // Only attempt to generate schedule if user has selected subjects
            if (user?.selectedSubjects && Array.isArray(user.selectedSubjects) && user.selectedSubjects.length > 0) {
              console.log('Attempting to generate new schedule...');
              
              const formattedToday = format(today, 'yyyy-MM-dd');
              
              // Explicitly call the schedule generation endpoint
              await scheduleAPI.generateSchedule(formattedToday, 7); // Generate a week of schedule
              
              console.log('Schedule generated, fetching for today...');
              
              // Try fetching again after generating
              let regeneratedSchedule = null;
              try {
                regeneratedSchedule = await scheduleAPI.getScheduleForDate(dateFormatted);
              } catch (refetchError) {
                console.error("Error fetching regenerated schedule:", refetchError);
                regeneratedSchedule = null;
              }
              
              if (regeneratedSchedule && 
                  regeneratedSchedule.plannedSessions && 
                  Array.isArray(regeneratedSchedule.plannedSessions)) {
                try {
                  // Update with newly generated schedule
                  const mappedSessions = regeneratedSchedule.plannedSessions
                    .filter((session: any) => session !== null && typeof session === 'object')
                    .map((session: any) => ({
                      id: session._id || session.itemId || `session-${Math.random()}`,
                      type: session.type || 'lecture',
                      name: session.name || 'Study Session',
                      moduleName: session.moduleName || '',
                      subjectName: session.subjectName || '',
                      duration: typeof session.duration === 'number' ? session.duration : 0,
                      completed: Boolean(session.completed)
                    }));
                  
                  // Calculate safe values
                  const totalPlannedDuration = typeof regeneratedSchedule.totalPlannedDuration === 'number' 
                    ? regeneratedSchedule.totalPlannedDuration 
                    : mappedSessions.reduce((sum: number, s: any) => sum + s.duration, 0);
                    
                  const totalCompletedDuration = typeof regeneratedSchedule.totalCompletedDuration === 'number'
                    ? regeneratedSchedule.totalCompletedDuration
                    : mappedSessions.filter((s: any) => s.completed).reduce((sum: number, s: any) => sum + s.duration, 0);
                  
                  // Calculate percentage with safety check
                  let percentCompleted = 0;
                  if (totalPlannedDuration > 0) {
                    percentCompleted = Math.round((totalCompletedDuration / totalPlannedDuration) * 100);
                    percentCompleted = Math.max(0, Math.min(100, percentCompleted));
                  }
                  
                  setTodaySchedule({
                    date: today.toLocaleDateString(),
                    plannedSessions: mappedSessions,
                    totalPlannedDuration,
                    totalCompletedDuration,
                    percentCompleted
                  });
                } catch (mappingError) {
                  console.error("Error mapping regenerated schedule:", mappingError);
                  // Keep the empty schedule we already set
                }
              }
            } else {
              // User hasn't selected subjects, show a message prompting them to do so
              toast.info('Select subjects in settings to generate your study schedule', {
                duration: 5000,
                action: {
                  label: 'Go to Settings',
                  onClick: () => router.push('/settings')
                }
              });
            }
          } catch (scheduleError: any) {
            console.error("Error generating schedule:", scheduleError);
            
            // Show user-friendly error message
            const errorMessage = scheduleError.userFriendlyMessage || 
                                'Could not generate your schedule. Please check your settings.';
            toast.error(errorMessage, {
              duration: 5000,
              action: {
                label: 'Go to Settings',
                onClick: () => router.push('/settings')
              }
            });
          }
        }
        
        // Calculate study stats based on user data with error handling
        try {
          // Make sure we have a valid dailyTarget
          let dailyTarget = 120; // Default to 2 hours if nothing is set
          
          if (user && user.dailyTarget && user.selectedPlan) {
            try {
              // Default targets as fallback
              const defaultTargets = {
                minimum: 120, // 2 hours
                moderate: 180, // 3 hours
                maximum: 240, // 4 hours
                custom: 180 // 3 hours
              } as const;
              
              // Try to get the target for the selected plan
              if (typeof user.selectedPlan === 'string' && 
                  user.dailyTarget && 
                  typeof user.dailyTarget === 'object') {
                  
                const plan = user.selectedPlan as keyof typeof defaultTargets;
                
                // Get the target for the selected plan
                const planTarget = user.dailyTarget[plan];
                
                if (typeof planTarget === 'number' && planTarget > 0) {
                  dailyTarget = planTarget;
                } else if (user.selectedPlan === 'custom' && 
                           typeof user.dailyTarget.custom === 'number' && 
                           user.dailyTarget.custom > 0) {
                  dailyTarget = user.dailyTarget.custom;
                } else {
                  // Use default if plan target is invalid
                  dailyTarget = (
                    defaultTargets[plan as keyof typeof defaultTargets] || 
                    defaultTargets.moderate
                  );
                }
              }
            } catch (planError) {
              console.error("Error determining daily target from plan:", planError);
              // Keep the default value
            }
          }
          
          console.log('Using daily target:', dailyTarget, 'minutes');
          
          // Get the completed duration from today's schedule
          const completedDuration = todaySchedule.totalCompletedDuration || 0;
          
          // Calculate percentage with safety check
          let dailyTargetPercentage = 0;
          if (dailyTarget > 0) {
            dailyTargetPercentage = Math.round((completedDuration / dailyTarget) * 100);
            // Ensure percentage is within bounds
            dailyTargetPercentage = Math.max(0, Math.min(100, dailyTargetPercentage));
          }
          
          // Calculate total hours with safety check
          let totalHours = 0;
          if (user && user.totalStudyTime !== undefined && typeof user.totalStudyTime === 'number') {
            totalHours = Math.floor(user.totalStudyTime / 60);
            // Ensure non-negative
            totalHours = Math.max(0, totalHours);
          }
          
          // Get streak with safety check
          let streak = 0;
          if (user && user.streak !== undefined && typeof user.streak === 'number') {
            streak = user.streak;
            // Ensure non-negative
            streak = Math.max(0, streak);
          }
          
          // Create stats object with safe values
          const stats: StudyStats = {
            streak,
            totalHours,
            dailyGoal: dailyTarget,
            dailyProgress: completedDuration,
            dailyTarget: dailyTargetPercentage
          };
          
          setStats(stats);
        } catch (statsError) {
          console.error("Error calculating study stats:", statsError);
          // Set default stats on error
          setStats({
            streak: 0,
            totalHours: 0,
            dailyGoal: 120, // 2 hours default
            dailyProgress: 0,
            dailyTarget: 0
          });
        }
      } catch (error) {
        console.error('Error fetching schedule:', error);
        toast.error('Failed to load today\'s schedule');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      fetchTodaySchedule();
    }
  }, [authLoading, user]);
  
  // Complete a study session (helper function)
  const completeSession = async (session: SessionItem, duration: number) => {
    try {
      if (!session || !session.id) {
        console.error('Invalid session or missing ID:', session);
        return false;
      }
      
      if (typeof duration !== 'number' || isNaN(duration) || duration <= 0) {
        console.error('Invalid duration for session completion:', duration);
        return false;
      }
      
      const sessionId = session.id;
      
      // Method 1: Try direct update via study session API
      try {
        console.log('Completing session:', {
          id: sessionId,
          name: session.name,
          type: session.type,
          duration: duration
        });
        
        await studySessionAPI.completeSession(sessionId, { 
          duration: duration,
          type: session.type, // Make sure to include type for proper handling
          notes: `Completed ${session.name} (${session.type})`
        });
        return true;
      } catch (apiError) {
        console.warn('Could not complete session via API, trying direct study session creation:', apiError);
        
        // Method 2: Fallback to creating a new study session if the first approach fails
        // Parse IDs from session ID if possible
        const idParts = sessionId.split('-');
        const subjectId = idParts.length >= 3 ? idParts[0] : sessionId;
        const moduleId = idParts.length >= 3 ? idParts[1] : sessionId;
        const itemId = idParts.length >= 3 ? idParts[2] : sessionId;
        
        console.log('Creating direct study session with parsed IDs:', {
          subjectId,
          moduleId,
          itemId,
          type: session.type
        });
        
        // Create study session directly
        await studySessionAPI.createSession({
          subjectId: subjectId,
          moduleId: moduleId,
          itemId: itemId,
          type: session.type,
          duration: duration,
          notes: `Marked as completed: ${session.name}`
        });
        
        return true;
      }
    } catch (error) {
      console.error('Error completing session:', error);
      return false;
    }
  };

  // Start a study session by redirecting to timer page
  const startSession = (session: SessionItem) => {
    try {
      if (!session) {
        console.error('Attempting to start a null or undefined session');
        toast.error('Cannot start session: invalid session data');
        return;
      }
      
      // Redirect to timer page with session information
      const params = new URLSearchParams({
        contentId: session.id,
        type: session.type,
        name: session.name,
        moduleName: session.moduleName || '',
        subjectName: session.subjectName || '',
        duration: session.duration.toString()
      });
      
      router.push(`/timer?${params.toString()}`);
      toast.success(`Starting: ${session.name || 'study session'}`);
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Failed to start session');
    }
  };

  // Mark a session as completed without using the timer
  const markAsCompleted = async (session: SessionItem) => {
    try {
      if (!session || !session.id) {
        console.error('Invalid session or missing ID for completion');
        toast.error('Cannot complete session: missing data');
        return;
      }
      
      // Validate duration
      if (typeof session.duration !== 'number' || isNaN(session.duration) || session.duration <= 0) {
        console.error('Invalid duration for session:', session);
        toast.error('Cannot complete session: invalid duration');
        return;
      }
      
      // Parse id components if they exist in the format we expect
      let subjectId = "000000000000000000000000"; // Default placeholder ID
      let moduleId = "000000000000000000000000"; // Default placeholder ID
      let itemId = session.id;
      
      try {
        // Try to extract IDs if they're in the format we expect (MongoDB IDs)
        if (typeof session.id === 'string') {
          const idParts = session.id.split("-");
          if (idParts.length >= 3) {
            subjectId = idParts[0] || subjectId;
            moduleId = idParts[1] || moduleId;
            itemId = idParts[2] || itemId;
          } else {
            // Default to simple ID structure
            subjectId = session.id;
            moduleId = session.id;
          }
        }
      } catch (parseError) {
        console.error('Error parsing session ID:', parseError);
        // Continue with default IDs
      }
      
      // We should only make ONE API call to avoid duplicate entries
      console.log('Using session type:', session.type);
      
      // Only use the completeSession function - DON'T make two separate API calls
      const success = await completeSession(session, session.duration);
      
      if (success) {
        try {
          // Optimistic update with safety checks
          setTodaySchedule(prev => {
            // Validate previous state
            if (!prev || !Array.isArray(prev.plannedSessions)) {
              console.error('Invalid previous schedule state:', prev);
              return prev;
            }
            
            // Update sessions
            const updatedSessions = prev.plannedSessions.map(s => 
              s && s.id === session.id ? { ...s, completed: true } : s
            );
            
            // Calculate new metrics safely
            const totalPlanned = prev.totalPlannedDuration > 0 ? prev.totalPlannedDuration : 
                                updatedSessions.reduce((sum, s) => sum + (s?.duration || 0), 0);
            
            const totalCompleted = updatedSessions.reduce((sum, s) => 
              s && s.completed ? sum + (s.duration || 0) : sum, 0
            );
            
            // Calculate percentage with safety check
            let percentCompleted = 0;
            if (totalPlanned > 0) {
              percentCompleted = Math.round((totalCompleted / totalPlanned) * 100);
              percentCompleted = Math.max(0, Math.min(100, percentCompleted));
            }
            
            return {
              ...prev,
              plannedSessions: updatedSessions,
              totalCompletedDuration: totalCompleted,
              percentCompleted
            };
          });
          
          // Update stats with safety checks
          setStats(prev => {
            if (!prev) {
              console.error('Invalid previous stats state:', prev);
              return prev;
            }
            
            const newDailyProgress = (prev.dailyProgress || 0) + (session.duration || 0);
            
            let newDailyTarget = 0;
            const dailyGoal = prev.dailyGoal || 120; // Default to 2 hours if not set
            if (dailyGoal > 0) {
              newDailyTarget = Math.round((newDailyProgress / dailyGoal) * 100);
              newDailyTarget = Math.max(0, Math.min(100, newDailyTarget));
            }
            
            // Check if we've met 80% of the daily target - show streak update notification
            if (newDailyTarget >= 80 && prev.dailyTarget < 80) {
              toast.success('You\'ve reached 80% of your daily target! Your streak has been updated.', {
                duration: 5000
              });
            }
            
            return {
              ...prev,
              dailyProgress: newDailyProgress,
              dailyTarget: newDailyTarget
            };
          });
        } catch (stateError) {
          console.error('Error updating state after session completion:', stateError);
          // Continue to show success message anyway
        }
        
        toast.success(`Marked as completed: ${session.name || 'session'}`);
        
        // If this was the active session, clear it
        if (activeSession && activeSession.id === session.id) {
          setActiveSession(null);
        }
      } else {
        toast.error('Failed to mark session as completed');
      }
    } catch (error) {
      console.error('Error marking session as completed:', error);
      toast.error('Failed to mark session as completed');
    }
  };

  // Format duration in minutes to a readable format
  const formatDuration = (minutes: number): string => {
    try {
      // Validate input
      if (typeof minutes !== 'number' || isNaN(minutes)) {
        console.warn('Invalid minutes passed to formatDuration:', minutes);
        return '0m';
      }
      
      // Ensure non-negative
      const safeMinutes = Math.max(0, minutes);
      
      const hours = Math.floor(safeMinutes / 60);
      const mins = Math.round(safeMinutes % 60);
      
      if (hours > 0) {
        return `${hours}h ${mins > 0 ? mins + 'm' : ''}`;
      }
      return `${mins}m`;
    } catch (error) {
      console.error('Error formatting duration:', error);
      return '0m'; // Default fallback
    }
  };

  // Get icon based on session type with error handling
  const getSessionIcon = (type: string) => {
    try {
      if (!type || typeof type !== 'string') {
        // Default icon for invalid types
        return <BookOpen className="h-4 w-4" />;
      }
      
      // Normalize the type to lowercase for case-insensitive comparison
      const normalizedType = type.toLowerCase();
      
      switch (normalizedType) {
        case 'lecture':
          return <BookOpen className="h-4 w-4 text-blue-500" />;
        case 'quiz':
          return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case 'homework':
          return <BarChart3 className="h-4 w-4 text-purple-500" />;
        case 'pyq':
          return <Award className="h-4 w-4 text-amber-500" />;
        default:
          return <BookOpen className="h-4 w-4" />;
      }
    } catch (error) {
      console.error('Error getting session icon:', error);
      // Safe fallback
      return <BookOpen className="h-4 w-4" />;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mb-4 mx-auto"></div>
          <p className="text-muted-foreground">Loading your study dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl px-4 py-6">
      <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name}</h1>
      
      {daysRemaining !== null && (
        <p className="text-lg text-muted-foreground mb-6">
          {daysRemaining > 0 
            ? `${daysRemaining} days remaining until your GATE exam`
            : "Your GATE exam deadline has arrived. Good luck!"}
        </p>
      )}
      
      
      <div className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Study Sessions for Today</CardTitle>
              <CardDescription>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </CardDescription>
            </div>
            
            {activeSession && (
              <div className="bg-accent/50 rounded-md p-2 text-sm">
                <div className="font-medium">Active Session:</div>
                <div className="flex items-center gap-1">
                  {getSessionIcon(activeSession.type)}
                  <span>{activeSession.name}</span>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {todaySchedule.plannedSessions.length > 0 ? (
              <div className="space-y-4">
                {/* Show prepone button if all sessions completed */}
                {todaySchedule.plannedSessions.every(session => session.completed) && (
                  <div className="flex justify-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg mb-4">
                    <div className="text-center">
                      <p className="text-green-700 dark:text-green-400 font-medium mb-2">
                        Awesome! You've completed all of today's tasks!
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button 
                          onClick={() => {
                            // Navigate to calendar to see next day's schedule
                            router.push('/calendar');
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          View Next Day's Schedule
                        </Button>
                        <Button 
                          onClick={async () => {
                            try {
                              toast.loading('Preparing tomorrow\'s schedule for today...');
                              // Call API to generate schedule with tomorrow's date as start date
                              const tomorrow = new Date();
                              tomorrow.setDate(tomorrow.getDate() + 1);
                              const tomorrowFormatted = format(tomorrow, 'yyyy-MM-dd');
                              
                              await scheduleAPI.generateSchedule(tomorrowFormatted, 1, true);
                              
                              // Refresh today's schedule
                              const today = new Date();
                              const todayFormatted = format(today, 'yyyy-MM-dd');
                              const updatedSchedule = await scheduleAPI.getScheduleForDate(todayFormatted);
                              
                              // Navigate to dashboard to see preponed schedule
                              window.location.reload();
                              toast.success('Tomorrow\'s schedule is now available for today!');
                            } catch (error) {
                              console.error('Error preponing schedule:', error);
                              toast.error('Failed to prepone schedule. Please try again.');
                            }
                          }}
                          variant="outline"
                        >
                          Prepone Tomorrow's Schedule
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {todaySchedule.plannedSessions.map((session) => (
                  <div 
                    key={session.id} 
                    className={`p-4 rounded-lg border ${
                      session.completed ? 'bg-muted/50' : session.id === activeSession?.id ? 'bg-accent/30' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`mt-0.5 p-1.5 rounded-full ${
                          session.completed ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900'
                        }`}>
                          {getSessionIcon(session.type)}
                        </div>
                        <div>
                          <h3 className="font-medium">{session.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {session.moduleName} · {session.subjectName}
                          </p>
                          <p className="text-sm mt-1">
                            <span className="inline-flex items-center bg-muted px-2 py-0.5 rounded text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDuration(session.duration)}
                            </span>
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted">
                              {session.type.charAt(0).toUpperCase() + session.type.slice(1)}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {!session.completed && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => markAsCompleted(session)}
                            >
                              Mark Done
                            </Button>
                          </>
                        )}
                        {session.completed && (
                          <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No study sessions scheduled for today.</p>
                <Button 
                  onClick={() => router.push('/calendar')}
                  className="mt-4"
                >
                  Go to Calendar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;