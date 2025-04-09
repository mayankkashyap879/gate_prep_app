// frontend/src/app/(dashboard)/subjects/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, Search, Clock, BarChart3, CheckCircle, Settings } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { subjectsAPI } from '@/lib/api';
import { toast } from 'sonner';

// Subject interface
interface Subject {
  _id: string;
  name: string;
  description?: string;
  progress: number;
  totalModules: number;
  completedModules: number;
  totalDuration: number; // in minutes
  priority: number;
  color?: string;
  modules: any[];
}

export default function SubjectsPage() {
  const router = useRouter();
  const { user, loading: userLoading, refreshUser } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<{[key: string]: number}>({});

  // Map to store subject colors
  const colorMap: {[key: string]: string} = {
    0: 'bg-blue-500',
    1: 'bg-green-500',
    2: 'bg-purple-500',
    3: 'bg-orange-500',
    4: 'bg-red-500',
    5: 'bg-teal-500',
    6: 'bg-pink-500',
    7: 'bg-indigo-500',
    8: 'bg-yellow-500',
    9: 'bg-cyan-500',
  };

  // Fetch subjects data and user's selected subjects
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all subjects
        const subjectsData = await subjectsAPI.getAllSubjects();
        
        // Add additional properties to each subject for UI with better error handling
        const enhancedSubjects = Array.isArray(subjectsData) 
          ? subjectsData
              .filter((subject: any) => !!subject) // Filter out null/undefined subjects
              .map((subject: any, index: number) => ({
                ...subject,
                _id: subject._id || `subject-${index}`, // Ensure ID exists
                name: subject.name || `Subject ${index + 1}`, // Ensure name exists
                progress: 0, // This would be calculated from user progress data in a real app
                totalModules: subject.modules && Array.isArray(subject.modules) ? subject.modules.length : 0,
                completedModules: 0, // This would be calculated from user progress data in a real app
                color: colorMap[index % Object.keys(colorMap).length]
              }))
          : [];
        
        setAllSubjects(enhancedSubjects);
        
        // Get user data to extract selected subjects with better error handling
        if (user) {
          try {
            // Extract selected subject IDs safely
            let userSelectedIds: any[] = [];
            
            if (user.selectedSubjects) {
              if (Array.isArray(user.selectedSubjects)) {
                userSelectedIds = user.selectedSubjects;
              } else if (typeof user.selectedSubjects === 'string') {
                // Handle single ID as string
                userSelectedIds = [user.selectedSubjects];
              }
            }
            
            // Process to get clean IDs
            const cleanedSelectedIds = userSelectedIds
              .filter(Boolean) // Remove null/undefined
              .map((s: any) => {
                if (typeof s === 'string') return s;
                if (s && typeof s === 'object' && s._id) return s._id;
                return null;
              })
              .filter(Boolean); // Remove any nulls
            
            setSelectedSubjectIds(cleanedSelectedIds);
            
            // Extract priorities if available
            if (user.subjectPriorities && typeof user.subjectPriorities === 'object') {
              setPriorities(user.subjectPriorities);
            }
            
            // Filter subjects to only include those selected by user
            const userSubjects = enhancedSubjects.filter((subject: Subject) => 
              cleanedSelectedIds.some((id: string) => id === subject._id)
            );
            
            // Apply priorities from user data
            userSubjects.forEach((subject: Subject) => {
              if (user.subjectPriorities && 
                  typeof user.subjectPriorities === 'object' && 
                  subject._id && 
                  user.subjectPriorities[subject._id] !== undefined) {
                subject.priority = Number(user.subjectPriorities[subject._id]) || 5;
              } else {
                subject.priority = 5; // Default priority
              }
            });
            
            setSubjects(userSubjects);
          } catch (userDataError) {
            console.error("Error processing user subject data:", userDataError);
            setSubjects([]);
          }
        } else {
          setSubjects([]);
        }
      } catch (error) {
        console.error('Error fetching subjects:', error);
        toast.error('Failed to load subjects');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Filter subjects based on search query
  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format duration in minutes to hours and minutes
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins > 0 ? mins + 'm' : ''}`;
  };

  // Navigate to subject detail page
  const handleSubjectClick = (subjectId: string) => {
    router.push(`/subjects/${subjectId}`);
  };
  
  // Navigate to settings to manage subject selection
  const navigateToSettings = () => {
    router.push('/settings');
  };

  return (
    <div className="container max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Subjects</h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1"
            onClick={navigateToSettings}
          >
            <Settings className="h-4 w-4" />
            Manage Subjects
          </Button>
          {subjects.length > 0 && (
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subjects..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {isLoading || userLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="relative overflow-hidden animate-pulse">
              <div className="h-3 w-full bg-muted/60 absolute top-0 left-0"></div>
              <CardHeader className="pb-2">
                <div className="h-6 w-2/3 bg-muted/60 rounded"></div>
                <div className="h-4 w-full bg-muted/60 rounded"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-3 w-full bg-muted/60 rounded"></div>
                <div className="h-10 w-full bg-muted/60 rounded"></div>
                <div className="flex justify-between">
                  <div className="h-4 w-20 bg-muted/60 rounded"></div>
                  <div className="h-4 w-20 bg-muted/60 rounded"></div>
                </div>
              </CardContent>
              <CardFooter>
                <div className="h-9 w-full bg-muted/60 rounded"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/10 p-8">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No subjects selected</h3>
          <p className="text-muted-foreground mb-6">You haven't selected any subjects to study yet</p>
          <Button onClick={navigateToSettings}>Select Subjects in Settings</Button>
        </div>
      ) : filteredSubjects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((subject) => (
            <Card 
              key={subject._id} 
              className="relative overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleSubjectClick(subject._id)}
            >
              <div className={`h-2 w-full ${subject.color || 'bg-primary'} absolute top-0 left-0`}></div>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  {subject.name}
                </CardTitle>
                <CardDescription>{subject.description || `Study material for ${subject.name}`}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">{subject.progress}%</span>
                  </div>
                  <Progress value={subject.progress} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDuration(subject.totalDuration)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span>Priority: {subject.priority}/10</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span>{subject.totalModules} Modules</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <span>{subject.completedModules}/{subject.totalModules} Complete</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="secondary" className="w-full">View Subject</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No subjects found</h3>
          <p className="text-muted-foreground">Try adjusting your search or check again later</p>
        </div>
      )}
    </div>
  );
}