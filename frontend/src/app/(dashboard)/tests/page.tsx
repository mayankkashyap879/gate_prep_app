"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Test, testService } from "@/lib/data-service";
import { toast } from "sonner";

export default function TestsPage() {
  const [allTests, setAllTests] = useState<Test[]>([]);
  const [completedTests, setCompletedTests] = useState<Test[]>([]);
  const [unattemptedTests, setUnattemptedTests] = useState<Test[]>([]);
  const [filteredTests, setFilteredTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [scoreInput, setScoreInput] = useState('');
  const [maxScoreInput, setMaxScoreInput] = useState('');
  const [timeSpentInput, setTimeSpentInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogCloseRef = useRef<HTMLButtonElement>(null);

  // Function to get default tab from URL parameters
  const getDefaultTab = () => {
    // Check if window is defined (client-side only)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      // Only accept valid tab values
      if (tab && ['all', 'unattempted', 'completed'].includes(tab)) {
        return tab;
      }
    }
    return 'all'; // Default tab
  };

  useEffect(() => {
    const loadTests = async () => {
      try {
        setIsLoading(true);
        
        // Fetch tests with individual try/catch blocks to handle partial failures
        let all: Test[] = [];
        let completed: Test[] = [];
        let unattempted: Test[] = [];
        
        try {
          all = await testService.getAllTests();
          if (!Array.isArray(all)) {
            console.error("getAllTests did not return an array:", all);
            all = [];
          }
        } catch (error) {
          console.error("Error loading all tests:", error);
          toast.error("Failed to load all tests");
          all = [];
        }
        
        try {
          completed = await testService.getCompletedTests();
          if (!Array.isArray(completed)) {
            console.error("getCompletedTests did not return an array:", completed);
            completed = [];
          }
        } catch (error) {
          console.error("Error loading completed tests:", error);
          toast.error("Failed to load completed tests");
          completed = [];
        }
        
        try {
          unattempted = await testService.getUnattemptedTests();
          if (!Array.isArray(unattempted)) {
            console.error("getUnattemptedTests did not return an array:", unattempted);
            unattempted = [];
          }
        } catch (error) {
          console.error("Error loading unattempted tests:", error);
          toast.error("Failed to load unattempted tests");
          unattempted = [];
        }
        
        // Sort tests with error handling
        const sortedAll = sortByDate(all);
        const sortedCompleted = sortByDate(completed);
        const sortedUnattempted = sortByDate(unattempted);
        
        // Update state
        setAllTests(sortedAll);
        setFilteredTests(sortedAll);
        setCompletedTests(sortedCompleted);
        setUnattemptedTests(sortedUnattempted);
      } catch (error) {
        console.error("Unexpected error in loadTests:", error);
        toast.error("Failed to load tests");
        
        // Reset all data on critical error
        setAllTests([]);
        setFilteredTests([]);
        setCompletedTests([]);
        setUnattemptedTests([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTests();
  }, []);

  const applySearch = (tests: Test[]) => {
    try {
      if (!searchTerm) return tests || [];
      if (!Array.isArray(tests)) {
        console.error("Expected array for applySearch but received:", tests);
        return [];
      }
      
      const lowerSearch = searchTerm.toLowerCase();
      return tests.filter(test => {
        try {
          if (!test) return false;
          
          const nameMatch = test.name ? test.name.toLowerCase().includes(lowerSearch) : false;
          const topicsMatch = getTopicString(test).toLowerCase().includes(lowerSearch);
          
          return nameMatch || topicsMatch;
        } catch (error) {
          console.error("Error filtering test:", error, test);
          return false;
        }
      });
    } catch (error) {
      console.error("Error applying search:", error);
      return [];
    }
  };

  useEffect(() => {
    try {
      if (searchTerm) {
        const filtered = applySearch(allTests);
        setFilteredTests(sortByDate(filtered));
      } else {
        setFilteredTests(sortByDate(allTests));
      }
    } catch (error) {
      console.error("Error updating filtered tests:", error);
      // Set to empty array as fallback if filtering fails
      setFilteredTests([]);
    }
  }, [searchTerm, allTests]);

  const handleStartTest = (test: Test) => {
    try {
      // Open the test in a new tab if there's a link
      if (!test) {
        toast.error("Cannot open test: test data is missing");
        return;
      }
      
      if (test.link) {
        window.open(test.link, '_blank');
      } else {
        toast.info(`Starting test: ${test.name || 'Unnamed test'}`);
      }
    } catch (error) {
      console.error("Error opening test:", error);
      toast.error("Failed to open test");
    }
  };

  const handleAddScore = (test: Test) => {
    try {
      if (!test) {
        toast.error("Cannot add score: test data is missing");
        return;
      }
      
      setSelectedTest(test);
      
      // Optionally pre-fill with existing data
      setScoreInput(test.score ? String(test.score) : '');
      setMaxScoreInput(test.maxScore ? String(test.maxScore) : '');
      setTimeSpentInput(test.timeSpent ? String(test.timeSpent) : '');
      setNotesInput(test.notes || '');
    } catch (error) {
      console.error("Error preparing score form:", error);
      toast.error("Failed to open score form");
    }
  };

  const handleSubmitScore = async () => {
    try {
      if (!selectedTest) {
        toast.error("No test selected");
        return;
      }
      
      // Validate inputs with clear error messages
      if (!scoreInput.trim() || !maxScoreInput.trim() || !timeSpentInput.trim()) {
        toast.error("Please fill in all required fields: score, max score, and time spent");
        return;
      }
      
      const score = parseInt(scoreInput);
      const maxScore = parseInt(maxScoreInput);
      const timeSpent = parseInt(timeSpentInput);
      
      if (isNaN(score) || isNaN(maxScore) || isNaN(timeSpent)) {
        toast.error("Please enter valid numbers for score, max score, and time spent");
        return;
      }
      
      if (score < 0 || maxScore <= 0 || timeSpent <= 0) {
        toast.error("Please enter positive numbers");
        return;
      }
      
      if (score > maxScore) {
        toast.error("Score cannot be greater than max score");
        return;
      }
      
      setIsSubmitting(true);
      
      // Get test ID with fallback
      const testId = selectedTest._id || selectedTest.id;
      if (!testId) {
        toast.error("Test ID is missing");
        setIsSubmitting(false);
        return;
      }
      
      // Mark test as completed
      await testService.markTestCompleted(
        testId, 
        score, 
        maxScore, 
        timeSpent,
        notesInput || undefined
      );
      
      toast.success("Test score saved successfully");
      
      // Refresh data with separate try/catch for each operation
      let all: Test[] = [];
      let completed: Test[] = [];
      let unattempted: Test[] = [];
      
      try {
        all = await testService.getAllTests();
        if (!Array.isArray(all)) {
          console.error("getAllTests after submit did not return an array:", all);
          all = [...allTests]; // Use existing data as fallback
        }
      } catch (error) {
        console.error("Error reloading all tests after submission:", error);
        all = [...allTests]; // Use existing data as fallback
      }
      
      try {
        completed = await testService.getCompletedTests();
        if (!Array.isArray(completed)) {
          console.error("getCompletedTests after submit did not return an array:", completed);
          completed = [...completedTests]; // Use existing data as fallback
        }
      } catch (error) {
        console.error("Error reloading completed tests after submission:", error);
        completed = [...completedTests]; // Use existing data as fallback
      }
      
      try {
        unattempted = await testService.getUnattemptedTests();
        if (!Array.isArray(unattempted)) {
          console.error("getUnattemptedTests after submit did not return an array:", unattempted);
          unattempted = [...unattemptedTests]; // Use existing data as fallback
        }
      } catch (error) {
        console.error("Error reloading unattempted tests after submission:", error);
        unattempted = [...unattemptedTests]; // Use existing data as fallback
      }
      
      // Sort and update state safely
      try {
        // Sort by date ascending and then by name
        const sortedAll = sortByDate(all);
        const sortedCompleted = sortByDate(completed);
        const sortedUnattempted = sortByDate(unattempted);
        
        setAllTests(sortedAll);
        setFilteredTests(sortByDate(applySearch(sortedAll)));
        setCompletedTests(sortedCompleted);
        setUnattemptedTests(sortedUnattempted);
      } catch (error) {
        console.error("Error updating test lists after submission:", error);
        // Don't attempt further state updates if this fails
      }
      
      // Try to close dialog
      try {
        if (dialogCloseRef.current) {
          dialogCloseRef.current.click();
        }
      } catch (error) {
        console.error("Error closing dialog:", error);
        // If dialog close fails, at least reset the form
        setSelectedTest(null);
        setScoreInput('');
        setMaxScoreInput('');
        setTimeSpentInput('');
        setNotesInput('');
      }
    } catch (error) {
      console.error("Error saving test score:", error);
      toast.error("Failed to save test score");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewSolutions = (test: Test) => {
    try {
      if (!test) {
        toast.error("Cannot view solutions: test data is missing");
        return;
      }
      
      if (test.link) {
        window.open(test.link, '_blank');
      } else {
        toast.info(`Solutions not available for: ${test.name || 'Unnamed test'}`);
      }
    } catch (error) {
      console.error("Error viewing solutions:", error);
      toast.error("Failed to open solutions");
    }
  };

  // Get formatted topic string
  const getTopicString = (test: Test): string => {
    try {
      if (!test) return '';
      
      if (Array.isArray(test.topics)) {
        return test.topics.join(', ');
      }
      return String(test.topics || '');
    } catch (error) {
      console.error("Error formatting topics for test:", error);
      return '';
    }
  };
  
  // Determine test type and return corresponding color
  const getTestTypeColor = (test: Test): { bgColor: string; borderColor: string; label: string } => {
    try {
      if (!test || !test.name) {
        // Default if test or name is missing
        return { 
          bgColor: 'bg-card', 
          borderColor: 'border-border',
          label: 'Test'
        };
      }
      
      const name = test.name.toLowerCase();
      
      if (name.includes('mock test')) {
        // Most important - Mock Tests
        return { 
          bgColor: 'bg-red-50 dark:bg-red-950/30', 
          borderColor: 'border-red-200 dark:border-red-800',
          label: 'Mock Test'
        };
      } else if (name.includes('subject wise') || name.includes('subject-wise')) {
        // Medium importance - Subject Wise Tests
        return { 
          bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          label: 'Subject Wise'
        };
      } else if (name.includes('topic wise') || name.includes('topic-wise')) {
        // Lesser importance - Topic Wise Tests
        return { 
          bgColor: 'bg-green-50 dark:bg-green-950/30',
          borderColor: 'border-green-200 dark:border-green-800',
          label: 'Topic Wise'
        };
      }
      
      // Default
      return { 
        bgColor: 'bg-card', 
        borderColor: 'border-border',
        label: 'Test'
      };
    } catch (error) {
      console.error("Error determining test type color:", error);
      // Fallback to default styling
      return { 
        bgColor: 'bg-card', 
        borderColor: 'border-border',
        label: 'Test'
      };
    }
  };

  // Format duration in minutes to a readable format
  const formatDuration = (minutes: number): string => {
    try {
      if (!minutes || isNaN(minutes)) return '';
      
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      
      if (hours > 0) {
        return `${hours}h ${mins > 0 ? mins + 'm' : ''}`;
      }
      return `${mins}m`;
    } catch (error) {
      console.error("Error formatting duration:", error);
      return '';
    }
  };
  
  // Sort tests by date (ascending) and then by name (lexicographically)
  const sortByDate = (tests: Test[]): Test[] => {
    if (!Array.isArray(tests)) {
      console.error("Expected array for sortByDate but received:", tests);
      return [];
    }
    
    try {
      return [...tests].sort((a, b) => {
        if (!a || !b) return 0;
        
        try {
          const dateA = a.date ? new Date(a.date) : new Date(0);
          const dateB = b.date ? new Date(b.date) : new Date(0);
          
          // Check for invalid dates
          if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
            // If either date is invalid, use string comparison as fallback
            return String(a.date || '').localeCompare(String(b.date || ''));
          }
          
          // First compare dates
          const dateDiff = dateA.getTime() - dateB.getTime();
          
          // If dates are the same, sort by name lexicographically
          if (dateDiff === 0) {
            return (a.name || '').localeCompare(b.name || '');
          }
          
          return dateDiff;
        } catch (error) {
          console.error("Error comparing test dates:", error);
          return 0; // Keep original order for problematic items
        }
      });
    } catch (error) {
      console.error("Error sorting tests:", error);
      return [...tests]; // Return unsorted copy on error
    }
  };


  if (isLoading) {
    return (
      <div className="container max-w-6xl px-4 py-6">
        <h1 className="text-3xl font-bold mb-6">Tests</h1>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-muted-foreground">Loading tests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Tests</h1>

      <Tabs defaultValue={getDefaultTab()} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Tests</TabsTrigger>
          <TabsTrigger value="unattempted">Unattempted</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <div className="mb-4">
          <Input
            placeholder="Search tests by name, topic, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-lg"
          />
        </div>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTests.length > 0 ? (
              filteredTests.map((test) => (
                <Card key={test._id || test.id} className={`${getTestTypeColor(test).borderColor} border`}>
                  <CardHeader className={`pb-2 ${getTestTypeColor(test).bgColor}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="mb-1">
                          <span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium" 
                                style={{ 
                                  backgroundColor: getTestTypeColor(test).label === 'Mock Test' ? '#FEE2E2' : 
                                                getTestTypeColor(test).label === 'Subject Wise' ? '#FEF3C7' : 
                                                getTestTypeColor(test).label === 'Topic Wise' ? '#DCFCE7' : '#E5E7EB',
                                  color: getTestTypeColor(test).label === 'Mock Test' ? '#B91C1C' : 
                                        getTestTypeColor(test).label === 'Subject Wise' ? '#92400E' : 
                                        getTestTypeColor(test).label === 'Topic Wise' ? '#166534' : '#374151'
                                }}>
                            {getTestTypeColor(test).label}
                          </span>
                        </div>
                        <CardTitle className="text-lg">{test.name}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium mb-2 line-clamp-2 text-muted-foreground">{getTopicString(test)}</p>
                    <div className="flex items-center text-sm">
                      <span className="font-medium">{test.date}</span>
                      {test.duration && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="text-muted-foreground">{formatDuration(test.duration)}</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    <Button 
                      className="w-full" 
                      onClick={() => handleStartTest(test)}
                    >
                      {test.link ? "Open Test on GateOverflow" : "Start Test"}
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline"
                          className="w-full" 
                          onClick={() => handleAddScore(test)}
                        >
                          {test.isCompleted ? "Update Score" : "Add Score"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{test.isCompleted ? "Update Test Score" : "Add Test Score"}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <p className="font-medium">{test.name}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label htmlFor="score" className="text-sm font-medium">Your Score</label>
                              <Input 
                                id="score" 
                                type="number" 
                                value={scoreInput} 
                                onChange={(e) => setScoreInput(e.target.value)}
                                placeholder="e.g., 70"
                              />
                            </div>
                            <div className="space-y-2">
                              <label htmlFor="maxScore" className="text-sm font-medium">Max Score</label>
                              <Input 
                                id="maxScore" 
                                type="number" 
                                value={maxScoreInput} 
                                onChange={(e) => setMaxScoreInput(e.target.value)}
                                placeholder="e.g., 100"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="timeSpent" className="text-sm font-medium">Time Spent (minutes)</label>
                            <Input 
                              id="timeSpent" 
                              type="number" 
                              value={timeSpentInput} 
                              onChange={(e) => setTimeSpentInput(e.target.value)}
                              placeholder="e.g., 180"
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</label>
                            <Input 
                              id="notes" 
                              value={notesInput} 
                              onChange={(e) => setNotesInput(e.target.value)}
                              placeholder="Any notes about your performance..."
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            ref={dialogCloseRef} 
                            type="button" 
                            variant="outline" 
                            className="hidden"
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            onClick={handleSubmitScore}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? "Saving..." : "Save Score"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center h-48 text-center">
                <p className="text-muted-foreground mb-2">
                  {searchTerm 
                    ? `No tests found matching "${searchTerm}".`
                    : "No tests available."
                  }
                </p>
                {searchTerm && (
                  <Button variant="outline" onClick={() => setSearchTerm('')}>Clear Search</Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="unattempted" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {unattemptedTests.length > 0 ? (
              sortByDate(applySearch(unattemptedTests)).map((test) => (
                <Card key={test._id || test.id} className={`${getTestTypeColor(test).borderColor} border`}>
                  <CardHeader className={`pb-2 ${getTestTypeColor(test).bgColor}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="mb-1">
                          <span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium" 
                                style={{ 
                                  backgroundColor: getTestTypeColor(test).label === 'Mock Test' ? '#FEE2E2' : 
                                                getTestTypeColor(test).label === 'Subject Wise' ? '#FEF3C7' : 
                                                getTestTypeColor(test).label === 'Topic Wise' ? '#DCFCE7' : '#E5E7EB',
                                  color: getTestTypeColor(test).label === 'Mock Test' ? '#B91C1C' : 
                                        getTestTypeColor(test).label === 'Subject Wise' ? '#92400E' : 
                                        getTestTypeColor(test).label === 'Topic Wise' ? '#166534' : '#374151'
                                }}>
                            {getTestTypeColor(test).label}
                          </span>
                        </div>
                        <CardTitle className="text-lg">{test.name}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium mb-2 line-clamp-2 text-muted-foreground">{getTopicString(test)}</p>
                    <div className="flex items-center text-sm">
                      <span className="font-medium">{test.date}</span>
                      {test.duration && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="text-muted-foreground">{formatDuration(test.duration)}</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    <Button 
                      className="w-full" 
                      onClick={() => handleStartTest(test)}
                    >
                      {test.link ? "Open Test on GateOverflow" : "Start Test"}
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline"
                          className="w-full" 
                          onClick={() => handleAddScore(test)}
                        >
                          Add Score
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Test Score</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <p className="font-medium">{test.name}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label htmlFor="score" className="text-sm font-medium">Your Score</label>
                              <Input 
                                id="score" 
                                type="number" 
                                value={scoreInput} 
                                onChange={(e) => setScoreInput(e.target.value)}
                                placeholder="e.g., 70"
                              />
                            </div>
                            <div className="space-y-2">
                              <label htmlFor="maxScore" className="text-sm font-medium">Max Score</label>
                              <Input 
                                id="maxScore" 
                                type="number" 
                                value={maxScoreInput} 
                                onChange={(e) => setMaxScoreInput(e.target.value)}
                                placeholder="e.g., 100"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="timeSpent" className="text-sm font-medium">Time Spent (minutes)</label>
                            <Input 
                              id="timeSpent" 
                              type="number" 
                              value={timeSpentInput} 
                              onChange={(e) => setTimeSpentInput(e.target.value)}
                              placeholder="e.g., 180"
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</label>
                            <Input 
                              id="notes" 
                              value={notesInput} 
                              onChange={(e) => setNotesInput(e.target.value)}
                              placeholder="Any notes about your performance..."
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            ref={dialogCloseRef} 
                            type="button" 
                            variant="outline" 
                            className="hidden"
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            onClick={handleSubmitScore}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? "Saving..." : "Save Score"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center h-48 text-center">
                <p className="text-muted-foreground mb-2">No unattempted tests found.</p>
                {searchTerm && (
                  <Button variant="outline" onClick={() => setSearchTerm('')}>Clear Search</Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {completedTests.length > 0 ? (
              sortByDate(applySearch(completedTests)).map((test) => (
                <Card key={test._id || test.id} className={`${getTestTypeColor(test).borderColor} border`}>
                  <CardHeader className={`${getTestTypeColor(test).bgColor}`}>
                    <div className="mb-1">
                      <span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium" 
                            style={{ 
                              backgroundColor: getTestTypeColor(test).label === 'Mock Test' ? '#FEE2E2' : 
                                            getTestTypeColor(test).label === 'Subject Wise' ? '#FEF3C7' : 
                                            getTestTypeColor(test).label === 'Topic Wise' ? '#DCFCE7' : '#E5E7EB',
                              color: getTestTypeColor(test).label === 'Mock Test' ? '#B91C1C' : 
                                    getTestTypeColor(test).label === 'Subject Wise' ? '#92400E' : 
                                    getTestTypeColor(test).label === 'Topic Wise' ? '#166534' : '#374151'
                            }}>
                        {getTestTypeColor(test).label}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{test.name}</CardTitle>
                    <p className="text-muted-foreground">Completed on {test.date}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-medium mb-2 line-clamp-2 text-muted-foreground">{getTopicString(test)}</p>
                      {test.score !== undefined && test.maxScore !== undefined && (
                        <div className="flex justify-between">
                          <span>Score:</span>
                          <span className="font-medium">{test.score}/{test.maxScore}</span>
                        </div>
                      )}
                      {test.timeSpent && (
                        <div className="flex justify-between">
                          <span>Time spent:</span>
                          <span className="font-medium">{formatDuration(test.timeSpent)}</span>
                        </div>
                      )}
                      {test.notes && (
                        <div className="pt-2">
                          <span className="text-sm text-muted-foreground">{test.notes}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Performance</span>
                        <span className="text-sm font-medium">
                          {test.score && test.maxScore 
                            ? Math.round((test.score / test.maxScore) * 100)
                            : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={test.score && test.maxScore 
                          ? Math.round((test.score / test.maxScore) * 100)
                          : 0
                        } 
                        className="h-2" 
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button 
                      variant="outline" 
                      onClick={() => handleViewSolutions(test)}
                    >
                      View Solutions
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          onClick={() => handleAddScore(test)}
                        >
                          Update Score
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Test Score</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <p className="font-medium">{test.name}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label htmlFor="score-update" className="text-sm font-medium">Your Score</label>
                              <Input 
                                id="score-update" 
                                type="number" 
                                value={scoreInput} 
                                onChange={(e) => setScoreInput(e.target.value)}
                                placeholder={test.score ? test.score.toString() : ""}
                              />
                            </div>
                            <div className="space-y-2">
                              <label htmlFor="maxScore-update" className="text-sm font-medium">Max Score</label>
                              <Input 
                                id="maxScore-update" 
                                type="number" 
                                value={maxScoreInput} 
                                onChange={(e) => setMaxScoreInput(e.target.value)}
                                placeholder={test.maxScore ? test.maxScore.toString() : ""}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="timeSpent-update" className="text-sm font-medium">Time Spent (minutes)</label>
                            <Input 
                              id="timeSpent-update" 
                              type="number" 
                              value={timeSpentInput} 
                              onChange={(e) => setTimeSpentInput(e.target.value)}
                              placeholder={test.timeSpent ? test.timeSpent.toString() : ""}
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="notes-update" className="text-sm font-medium">Notes (Optional)</label>
                            <Input 
                              id="notes-update" 
                              value={notesInput} 
                              onChange={(e) => setNotesInput(e.target.value)}
                              placeholder={test.notes || "Any notes about your performance..."}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            ref={dialogCloseRef} 
                            type="button" 
                            variant="outline" 
                            className="hidden"
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            onClick={handleSubmitScore}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? "Saving..." : "Update Score"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center h-48 text-center">
                <p className="text-muted-foreground mb-2">No completed tests yet.</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Take tests and add your scores to track your progress!
                </p>
                <Button onClick={() => window.location.href = '/tests?tab=all'}>
                  Browse Tests
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}