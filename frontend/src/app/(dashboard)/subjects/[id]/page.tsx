// frontend/src/app/(dashboard)/subjects/[id]/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  PlayCircle, 
  FileText, 
  Award,
  ChevronDown,
  ChevronUp,
  HomeIcon
} from 'lucide-react';
import { subjectsAPI, progressAPI } from '@/lib/api';
import { toast } from 'sonner';

// Interfaces
interface ContentItem {
  _id?: string;
  type: 'lecture' | 'quiz' | 'homework';
  name: string;
  durationMinutes: number;
  duration?: string;
  link?: string;
  description?: string;
  questionCount?: number;
  completed?: boolean; // This would be based on user progress
}

interface Module {
  _id?: string;
  name: string;
  description?: string;
  content: ContentItem[];
  progress?: number; // Calculate based on completed content items
}

interface PYQ {
  count: number;
  estimatedDuration: number;
  progress?: number; // This would be based on user progress
}

interface Subject {
  _id: string;
  name: string;
  description?: string;
  modules: Module[];
  pyqs: PYQ;
  totalDuration: number;
  priority?: number;
  progress?: number; // Calculate based on module progress
  color?: string; // For UI purposes
}

export default function SubjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params);

  // Fetch subject data
  useEffect(() => {
    const fetchSubject = async () => {
      setIsLoading(true);
      try {
        // Get subject details from API
        const subjectData = await subjectsAPI.getSubjectById(unwrappedParams.id);
        
        // Add color based on id
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
        
        // Enhance subject data with UI-specific props and ensure valid data
        const enhancedSubject: Subject = {
          ...subjectData,
          color: colorMap[parseInt(unwrappedParams.id) % 10] || 'bg-primary',
          // Make sure name exists
          name: subjectData.name || 'Unnamed Subject',
          // Ensure description is valid
          description: subjectData.description || `Study materials`,
          // Make sure totalDuration is a valid number
          totalDuration: subjectData.totalDuration && !isNaN(subjectData.totalDuration) ? 
            Number(subjectData.totalDuration) : 0,
          // Use progress from backend if available, otherwise default to 0
          progress: subjectData.progress !== undefined ? subjectData.progress : 0,
        };
        
        // Ensure PYQs object is valid with default values if needed
        if (!enhancedSubject.pyqs || typeof enhancedSubject.pyqs !== 'object') {
          enhancedSubject.pyqs = {
            count: 0,
            estimatedDuration: 0,
            progress: 0
          };
        } else {
          // Ensure valid values within the PYQs object
          enhancedSubject.pyqs = {
            ...enhancedSubject.pyqs,
            count: enhancedSubject.pyqs.count && !isNaN(enhancedSubject.pyqs.count) ? 
              Number(enhancedSubject.pyqs.count) : 0,
            estimatedDuration: enhancedSubject.pyqs.estimatedDuration && !isNaN(enhancedSubject.pyqs.estimatedDuration) ? 
              Number(enhancedSubject.pyqs.estimatedDuration) : 0,
            progress: enhancedSubject.pyqs.progress !== undefined ? enhancedSubject.pyqs.progress : 0
          };
        }
        
        // Make sure modules is defined
        if (!enhancedSubject.modules || !Array.isArray(enhancedSubject.modules)) {
          enhancedSubject.modules = [];
        }
        
        // Use module progress data from backend
        if (enhancedSubject.modules.length > 0) {
          enhancedSubject.modules = enhancedSubject.modules.map(module => {
            // Make sure module has a content array
            if (!module.content || !Array.isArray(module.content)) {
              module.content = [];
            }
            
            // Make sure module has a valid name (fix "Content for undefined")
            if (!module.name) {
              module.name = "Unnamed Module";
            }
            
            // The backend should already provide completion status for content items
            // If not, we'll ensure a default value
            const updatedContent = module.content.map((item, i) => ({
              ...item,
              // Ensure content has a name
              name: item.name || `Item ${i+1}`,
              completed: item.completed !== undefined ? item.completed : false,
              // Ensure durationMinutes is a valid number
              durationMinutes: (typeof item.durationMinutes === 'number' && !isNaN(item.durationMinutes)) ? 
                Number(item.durationMinutes) : 30 // Default to 30 minutes instead of 0
            }));
            
            return {
              ...module,
              content: updatedContent,
              // Use progress from backend if available
              progress: module.progress !== undefined ? module.progress : 0,
              name: module.name || 'Unnamed Module',
              description: module.description || `Content for ${module.name || 'this module'}`
            };
          });
        }
        
        console.log('Subject data with progress:', enhancedSubject);
        
        setSubject(enhancedSubject);
        
        // Initialize only the first module as expanded
        const initialExpandedState: Record<string, boolean> = {};
        enhancedSubject.modules.forEach((module, index) => {
          initialExpandedState[module._id || ''] = index === 0; // Only expand the first module
        });
        setExpandedModules(initialExpandedState);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching subject:', error);
        toast.error('Failed to load subject details');
        setIsLoading(false);
      }
    };

    if (unwrappedParams.id) {
      fetchSubject();
    }
  }, [unwrappedParams.id]);

  // Format duration in minutes to hours and minutes
  const formatDuration = (minutes: number): string => {
    // Make sure minutes is a valid number
    if (typeof minutes !== 'number' || isNaN(minutes)) {
      console.warn('Invalid duration value:', minutes);
      return '0h';
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins > 0 ? mins + 'm' : ''}`;
  };

  // Toggle module expansion
  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  // Handle study now button
  const handleStudyNow = (contentId: string, type: string, name: string, moduleName: string, subjectName: string, duration: number) => {
    // Construct full URL with all necessary parameters
    const params = new URLSearchParams({
      contentId: contentId,
      type: type,
      name: name,
      moduleName: moduleName,
      subjectName: subjectName,
      duration: duration.toString()
    });
    
    router.push(`/timer?${params.toString()}`);
  };

  // Get icon for content type
  const getContentIcon = (type: string) => {
    switch (type) {
      case 'lecture':
        return <BookOpen className="h-4 w-4" />;
      case 'quiz':
        return <FileText className="h-4 w-4" />;
      case 'homework':
        return <HomeIcon className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-muted/60 rounded mb-4"></div>
          <div className="h-4 w-full max-w-2xl bg-muted/60 rounded mb-8"></div>
          
          <div className="h-12 bg-muted/60 rounded mb-6"></div>
          
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-6">
              <div className="h-6 w-72 bg-muted/60 rounded mb-3"></div>
              <div className="h-3 w-full bg-muted/60 rounded mb-4"></div>
              <div className="h-24 w-full bg-muted/60 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="container max-w-6xl px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/subjects')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subjects
          </Button>
        </div>
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Subject not found</h3>
          <p className="text-muted-foreground">The subject you're looking for doesn't exist or has been removed</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push('/subjects')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Subjects
        </Button>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">{subject.name}</h1>
        </div>
        <p className="text-muted-foreground mt-2">{subject.description || `Study material for ${subject.name}`}</p>
        
        <div className="flex flex-wrap gap-8 mt-6">
          <div key="duration-info" className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span>Total Duration: {formatDuration(subject.totalDuration)}</span>
          </div>
          <div key="modules-info" className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <span>Modules: {subject.modules.length}</span>
          </div>
          {subject.progress !== undefined && (
            <div key="progress-info" className="flex flex-col gap-1">
              <div className="flex justify-between text-sm">
                <span key="progress-label">Overall Progress</span>
                <span key="progress-value">{subject.progress}%</span>
              </div>
              <Progress value={subject.progress} className="h-2 w-40" />
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="modules" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="pyqs">Previous Year Questions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="modules" className="space-y-6">
          {subject.modules.map((module, index) => (
            <Card key={`module-card-${module._id || index}`} className="overflow-hidden">
              <CardHeader 
                key={`module-header-${module._id || index}`}
                className="cursor-pointer flex flex-row items-center justify-between"
                onClick={() => toggleModule(module._id || '')}
              >
                <div key={`module-info-${module._id || index}`}>
                  <CardTitle key={`module-title-${module._id || index}`} className="flex items-center gap-2">
                    <BookOpen key={`module-icon-${module._id || index}`} className="h-5 w-5 text-primary" />
                    {module.name}
                  </CardTitle>
                  <CardDescription key={`module-desc-${module._id || index}`} className="mt-1">{module.description}</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  {module.progress !== undefined && (
                    <div key={`${module._id}-progress-container`} className="flex flex-col items-end">
                      <div key={`${module._id}-progress-label`} className="text-sm text-muted-foreground">Progress</div>
                      <div key={`${module._id}-progress-bar-container`} className="flex items-center gap-2">
                        <Progress value={module.progress} className="w-24 h-2" />
                        <span key={`${module._id}-progress-percentage`} className="text-sm font-medium">{module.progress}%</span>
                      </div>
                    </div>
                  )}
                  {expandedModules[module._id || ''] ? 
                    <ChevronUp key={`${module._id}-chevron-up`} className="h-5 w-5 text-muted-foreground" /> : 
                    <ChevronDown key={`${module._id}-chevron-down`} className="h-5 w-5 text-muted-foreground" />
                  }
                </div>
              </CardHeader>
              
              {expandedModules[module._id || ''] && (
                <CardContent key={`module-content-${module._id || index}`} className="pt-0">
                  <div key={`module-content-divider-${module._id || index}`} className="divide-y">
                    {module.content.map((item, itemIndex) => (
                      <div key={`content-item-${item._id || itemIndex}-${module._id || index}`} className="py-3 flex items-center justify-between">
                        <div key={`content-left-${item._id || itemIndex}`} className="flex items-center gap-3">
                          <div key={`content-icon-container-${item._id || itemIndex}`} className={`p-2 rounded-full ${
                            item.completed ? 'bg-green-100 dark:bg-green-900' : 'bg-muted'
                          }`}>
                            {item.completed ? 
                              <CheckCircle2 key={`content-check-icon-${item._id || itemIndex}`} className="h-4 w-4 text-green-600 dark:text-green-400" /> : 
                              <span key={`content-type-icon-${item._id || itemIndex}`}>{getContentIcon(item.type)}</span>
                            }
                          </div>
                          <div key={`content-details-${item._id || itemIndex}`}>
                            <h4 key={`content-title-${item._id || itemIndex}`} className="font-medium">{item.name}</h4>
                            <div key={`content-meta-${item._id || itemIndex}`} className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span key={`content-type-${item._id || itemIndex}`} className="capitalize">{item.type}</span>
                              <span key={`content-bullet1-${item._id || itemIndex}`}>•</span>
                              <span key={`content-duration-${item._id || itemIndex}`} className="flex items-center gap-1">
                                <Clock key={`content-clock-${item._id || itemIndex}`} className="h-3 w-3" />
                                {formatDuration(item.durationMinutes)}
                              </span>
                              {item.type === 'homework' && item.questionCount && (
                                <React.Fragment key={`content-questions-container-${item._id || itemIndex}`}>
                                  <span key={`content-bullet2-${item._id || itemIndex}`}>•</span>
                                  <span key={`content-questions-${item._id || itemIndex}`} className="flex items-center gap-1">
                                    <FileText key={`content-file-icon-${item._id || itemIndex}`} className="h-3 w-3" />
                                    {item.questionCount} Questions
                                  </span>
                                </React.Fragment>
                              )}
                            </div>
                          </div>
                        </div>
                        <div key={`content-actions-${item._id || itemIndex}`}>
                          {!item.completed && (
                            <Button
                              key={`content-mark-done-btn-${item._id || itemIndex}`}
                              size="sm"
                              variant="outline"
                              className="ml-2"
                              onClick={() => {
                                // API call to mark content as completed
                                progressAPI.updateProgress({
                                  subjectId: subject._id,
                                  topicId: item._id || '', // Using content ID as topic ID
                                  status: 'completed'
                                })
                                .then(() => {
                                  // Update the local state to reflect the change
                                  const updatedModules = [...subject.modules];
                                  updatedModules[index].content[itemIndex].completed = true;
                                  
                                  // Calculate new module progress
                                  const completedItems = updatedModules[index].content.filter(i => i.completed).length;
                                  const totalItems = updatedModules[index].content.length;
                                  const moduleProgress = Math.round((completedItems / totalItems) * 100);
                                  updatedModules[index].progress = moduleProgress;
                                  
                                  // Calculate overall subject progress
                                  const totalModuleProgress = updatedModules.reduce((sum, mod) => sum + (mod.progress || 0), 0);
                                  const overallProgress = Math.round(totalModuleProgress / updatedModules.length);
                                  
                                  setSubject({
                                    ...subject,
                                    modules: updatedModules,
                                    progress: overallProgress
                                  });
                                  
                                  toast.success('Item marked as completed!');
                                })
                                .catch(error => {
                                  console.error('Error marking item as completed:', error);
                                  toast.error('Failed to mark item as completed');
                                });
                              }}
                            >
                              <CheckCircle2 key={`content-check-icon-${item._id || itemIndex}`} className="h-4 w-4 mr-1" />
                              Mark Done
                            </Button>
                          )}
                          {item.completed && (
                            <Button
                              key={`content-completed-btn-${item._id || itemIndex}`}
                              size="sm"
                              variant="ghost"
                              className="ml-2 text-green-600 dark:text-green-400"
                              disabled
                            >
                              <CheckCircle2 key={`content-check-btn-icon-${item._id || itemIndex}`} className="h-4 w-4 mr-1" />
                              Completed
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="pyqs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Previous Year Questions
              </CardTitle>
              <CardDescription>
                Practice with {subject.pyqs.count} questions from previous GATE exams
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div key="pyq-info">
                    <div key="pyq-time-info" className="flex items-center gap-3 mb-2">
                      <Clock key="pyq-clock-icon" className="h-4 w-4 text-muted-foreground" />
                      <span key="pyq-estimated-time">Estimated Time: {formatDuration(subject.pyqs.estimatedDuration)}</span>
                    </div>
                    <div key="pyq-question-info" className="flex items-center gap-3">
                      <FileText key="pyq-file-icon" className="h-4 w-4 text-muted-foreground" />
                      <span key="pyq-question-count">Total Questions: {subject.pyqs.count}</span>
                    </div>
                  </div>
                  {subject.pyqs.progress !== undefined && (
                    <div key="pyq-progress-container" className="flex flex-col items-end">
                      <div key="pyq-progress-label" className="text-sm text-muted-foreground mb-1">Progress</div>
                      <div key="pyq-progress-bar-container" className="flex items-center gap-2">
                        <Progress value={subject.pyqs.progress} className="w-24 h-2" />
                        <span key="pyq-progress-percentage" className="text-sm font-medium">{subject.pyqs.progress}%</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-center">
                  {subject.pyqs.progress !== 100 && (
                    <Button 
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        // API call to mark PYQs as completed for this subject
                        progressAPI.updateProgress({
                          subjectId: subject._id,
                          topicId: 'pyqs', // Using 'pyqs' as a special topic ID
                          status: 'completed'
                        })
                        .then(() => {
                          // Update the local state to reflect the change
                          setSubject({
                            ...subject,
                            pyqs: {
                              ...subject.pyqs,
                              progress: 100
                            }
                          });
                          toast.success('PYQs marked as completed!');
                        })
                        .catch(error => {
                          console.error('Error marking PYQs as completed:', error);
                          toast.error('Failed to mark PYQs as completed');
                        });
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Done
                    </Button>
                  )}
                  {subject.pyqs.progress === 100 && (
                    <Button
                      variant="ghost"
                      className="text-green-600 dark:text-green-400 w-full"
                      disabled
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Completed
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}