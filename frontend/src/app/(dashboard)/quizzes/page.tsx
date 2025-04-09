"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Quiz, quizService } from "@/lib/data-service";
import { toast } from "sonner";

export default function QuizzesPage() {
  const [allQuizzes, setAllQuizzes] = useState<Quiz[]>([]);
  const [completedQuizzes, setCompletedQuizzes] = useState<Quiz[]>([]);
  const [unattemptedQuizzes, setUnattemptedQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
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
    const loadQuizzes = async () => {
      try {
        setIsLoading(true);
        
        // Fetch quizzes with individual try/catch blocks to handle partial failures
        let all: Quiz[] = [];
        let completed: Quiz[] = [];
        
        try {
          all = await quizService.getAllQuizzes();
          if (!Array.isArray(all)) {
            console.error("getAllQuizzes did not return an array:", all);
            all = [];
          }
        } catch (error) {
          console.error("Error loading all quizzes:", error);
          toast.error("Failed to load all quizzes");
          all = [];
        }
        
        try {
          completed = await quizService.getCompletedQuizzes();
          if (!Array.isArray(completed)) {
            console.error("getCompletedQuizzes did not return an array:", completed);
            completed = [];
          }
        } catch (error) {
          console.error("Error loading completed quizzes:", error);
          toast.error("Failed to load completed quizzes");
          completed = [];
        }
        
        // Sort quizzes with error handling
        const sortedAll = sortByDate(all);
        const sortedCompleted = sortByDate(completed);
        
        // Update state with safe values
        setAllQuizzes(sortedAll);
        setFilteredQuizzes(sortedAll);
        setCompletedQuizzes(sortedCompleted);
        
        // Create unattempted quizzes list with error handling
        try {
          // Create a Set of completed quiz IDs
          const completedIds = new Set(
            completed
              .filter(quiz => quiz && (quiz._id || quiz.id))
              .map(quiz => quiz._id || quiz.id)
          );
          
          // Filter all quizzes to find unattempted ones
          const unattempted = sortedAll.filter(quiz => {
            if (!quiz) return false;
            const quizId = quiz._id || quiz.id;
            return quizId && !completedIds.has(quizId);
          });
          
          setUnattemptedQuizzes(unattempted);
        } catch (error) {
          console.error("Error calculating unattempted quizzes:", error);
          setUnattemptedQuizzes([]);
        }
      } catch (error) {
        console.error("Unexpected error in loadQuizzes:", error);
        toast.error("Failed to load quizzes");
        
        // Reset all data on critical error
        setAllQuizzes([]);
        setFilteredQuizzes([]);
        setCompletedQuizzes([]);
        setUnattemptedQuizzes([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadQuizzes();
  }, []);

  const applySearch = (quizzes: Quiz[]) => {
    try {
      if (!searchTerm) return quizzes || [];
      if (!Array.isArray(quizzes)) {
        console.error("Expected array for applySearch but received:", quizzes);
        return [];
      }
      
      const lowerSearch = searchTerm.toLowerCase();
      return quizzes.filter(quiz => {
        try {
          if (!quiz) return false;
          
          const nameMatch = quiz.name ? quiz.name.toLowerCase().includes(lowerSearch) : false;
          const subjectMatch = quiz.subject ? quiz.subject.toLowerCase().includes(lowerSearch) : false;
          const topicsMatch = getTopicString(quiz).toLowerCase().includes(lowerSearch);
          
          return nameMatch || subjectMatch || topicsMatch;
        } catch (error) {
          console.error("Error filtering quiz:", error, quiz);
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
        const filtered = applySearch(allQuizzes);
        setFilteredQuizzes(sortByDate(filtered));
      } else {
        setFilteredQuizzes(sortByDate(allQuizzes));
      }
    } catch (error) {
      console.error("Error updating filtered quizzes:", error);
      // Set to empty array as fallback if filtering fails
      setFilteredQuizzes([]);
    }
  }, [searchTerm, allQuizzes]);

  const handleStartQuiz = (quiz: Quiz) => {
    try {
      // Open the quiz in a new tab
      if (!quiz) {
        toast.error("Cannot open quiz: quiz data is missing");
        return;
      }
      
      if (quiz.link) {
        window.open(quiz.link, '_blank');
      } else {
        toast.error("Quiz link not available");
      }
    } catch (error) {
      console.error("Error opening quiz:", error);
      toast.error("Failed to open quiz");
    }
  };

  const handleAddScore = (quiz: Quiz) => {
    try {
      if (!quiz) {
        toast.error("Cannot add score: quiz data is missing");
        return;
      }
      
      setSelectedQuiz(quiz);
      
      // Optionally pre-fill with existing data
      setScoreInput(quiz.score ? String(quiz.score) : '');
      setMaxScoreInput(quiz.maxScore ? String(quiz.maxScore) : '');
      setTimeSpentInput(quiz.timeSpent ? String(quiz.timeSpent) : '');
      setNotesInput(quiz.notes || '');
    } catch (error) {
      console.error("Error preparing score form:", error);
      toast.error("Failed to open score form");
    }
  };

  const handleSubmitScore = async () => {
    try {
      if (!selectedQuiz) {
        toast.error("No quiz selected");
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
      
      // Get quiz ID with fallback
      const quizId = selectedQuiz._id || selectedQuiz.id;
      if (!quizId) {
        toast.error("Quiz ID is missing");
        setIsSubmitting(false);
        return;
      }
      
      // Mark quiz as completed
      await quizService.markQuizCompleted(
        quizId, 
        score, 
        maxScore, 
        timeSpent,
        notesInput || undefined
      );
      
      toast.success("Quiz score saved successfully");
      
      // Refresh data with separate try/catch for each operation
      let all: Quiz[] = [];
      let completed: Quiz[] = [];
      
      try {
        all = await quizService.getAllQuizzes();
        if (!Array.isArray(all)) {
          console.error("getAllQuizzes after submit did not return an array:", all);
          all = [...allQuizzes]; // Use existing data as fallback
        }
      } catch (error) {
        console.error("Error reloading all quizzes after submission:", error);
        all = [...allQuizzes]; // Use existing data as fallback
      }
      
      try {
        completed = await quizService.getCompletedQuizzes();
        if (!Array.isArray(completed)) {
          console.error("getCompletedQuizzes after submit did not return an array:", completed);
          completed = [...completedQuizzes]; // Use existing data as fallback
        }
      } catch (error) {
        console.error("Error reloading completed quizzes after submission:", error);
        completed = [...completedQuizzes]; // Use existing data as fallback
      }
      
      // Sort and update state safely
      try {
        // Sort by date ascending
        const sortedAll = sortByDate(all);
        const sortedCompleted = sortByDate(completed);
        
        setAllQuizzes(sortedAll);
        setFilteredQuizzes(sortByDate(applySearch(sortedAll)));
        setCompletedQuizzes(sortedCompleted);
        
        // Update unattempted quizzes safely
        const completedIds = new Set(
          completed
            .filter(quiz => quiz && (quiz._id || quiz.id))
            .map(quiz => quiz._id || quiz.id)
        );
        
        const unattempted = sortedAll.filter(quiz => {
          if (!quiz) return false;
          const quizId = quiz._id || quiz.id;
          return quizId && !completedIds.has(quizId);
        });
        
        setUnattemptedQuizzes(unattempted);
      } catch (error) {
        console.error("Error updating quiz lists after submission:", error);
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
        setSelectedQuiz(null);
        setScoreInput('');
        setMaxScoreInput('');
        setTimeSpentInput('');
        setNotesInput('');
      }
    } catch (error) {
      console.error("Error saving quiz score:", error);
      toast.error("Failed to save quiz score");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get formatted topic string
  const getTopicString = (quiz: Quiz): string => {
    try {
      if (!quiz) return '';
      
      if (Array.isArray(quiz.topics)) {
        return quiz.topics.join(', ');
      }
      return String(quiz.topics || '');
    } catch (error) {
      console.error("Error formatting topics:", error);
      return '';
    }
  };
  
  // Sort quizzes by date (ascending) and then by name (lexicographically)
  const sortByDate = (quizzes: Quiz[]): Quiz[] => {
    if (!Array.isArray(quizzes)) {
      console.error("Expected array for sortByDate but received:", quizzes);
      return [];
    }
    
    try {
      return [...quizzes].sort((a, b) => {
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
          console.error("Error comparing quiz dates:", error);
          return 0; // Keep original order for problematic items
        }
      });
    } catch (error) {
      console.error("Error sorting quizzes:", error);
      return [...quizzes]; // Return unsorted copy on error
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl px-4 py-6">
        <h1 className="text-3xl font-bold mb-6">Quizzes</h1>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-muted-foreground">Loading quizzes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Quizzes</h1>

      <Tabs defaultValue={getDefaultTab()} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Quizzes</TabsTrigger>
          <TabsTrigger value="unattempted">Unattempted</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <div className="mb-4">
          <Input
            placeholder="Search quizzes by name, subject, or topic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-lg"
          />
        </div>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredQuizzes.length > 0 ? (
              filteredQuizzes.map((quiz) => (
                <Card key={quiz._id || quiz.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{quiz.subject}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium mb-2 line-clamp-2">{quiz.name}</p>
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{getTopicString(quiz)}</p>
                    <div className="flex items-center text-sm">
                      <span className="font-medium">{quiz.date}</span>
                      {quiz.remarks && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="text-muted-foreground">{quiz.remarks}</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    <Button 
                      className="w-full" 
                      onClick={() => handleStartQuiz(quiz)}
                    >
                      Open Quiz on GateOverflow
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline"
                          className="w-full" 
                          onClick={() => handleAddScore(quiz)}
                        >
                          {quiz.isCompleted ? "Update Score" : "Add Score"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{quiz.isCompleted ? "Update Quiz Score" : "Add Quiz Score"}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <p className="font-medium">{quiz.name}</p>
                            <p className="text-sm text-muted-foreground">{quiz.subject}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label htmlFor="score" className="text-sm font-medium">Your Score</label>
                              <Input 
                                id="score" 
                                type="number" 
                                value={scoreInput} 
                                onChange={(e) => setScoreInput(e.target.value)}
                                placeholder="e.g., 7"
                              />
                            </div>
                            <div className="space-y-2">
                              <label htmlFor="maxScore" className="text-sm font-medium">Max Score</label>
                              <Input 
                                id="maxScore" 
                                type="number" 
                                value={maxScoreInput} 
                                onChange={(e) => setMaxScoreInput(e.target.value)}
                                placeholder="e.g., 10"
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
                              placeholder="e.g., 30"
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
                    ? `No quizzes found matching "${searchTerm}".`
                    : "No quizzes available."
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
            {unattemptedQuizzes.length > 0 ? (
              sortByDate(applySearch(unattemptedQuizzes)).map((quiz) => (
                <Card key={quiz._id || quiz.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{quiz.subject}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium mb-2 line-clamp-2">{quiz.name}</p>
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{getTopicString(quiz)}</p>
                    <div className="flex items-center text-sm">
                      <span className="font-medium">{quiz.date}</span>
                      {quiz.remarks && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="text-muted-foreground">{quiz.remarks}</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    <Button 
                      className="w-full" 
                      onClick={() => handleStartQuiz(quiz)}
                    >
                      Open Quiz on GateOverflow
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline"
                          className="w-full" 
                          onClick={() => handleAddScore(quiz)}
                        >
                          Add Score
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Quiz Score</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <p className="font-medium">{quiz.name}</p>
                            <p className="text-sm text-muted-foreground">{quiz.subject}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label htmlFor="score" className="text-sm font-medium">Your Score</label>
                              <Input 
                                id="score" 
                                type="number" 
                                value={scoreInput} 
                                onChange={(e) => setScoreInput(e.target.value)}
                                placeholder="e.g., 7"
                              />
                            </div>
                            <div className="space-y-2">
                              <label htmlFor="maxScore" className="text-sm font-medium">Max Score</label>
                              <Input 
                                id="maxScore" 
                                type="number" 
                                value={maxScoreInput} 
                                onChange={(e) => setMaxScoreInput(e.target.value)}
                                placeholder="e.g., 10"
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
                              placeholder="e.g., 30"
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
                <p className="text-muted-foreground mb-2">No unattempted quizzes found.</p>
                {searchTerm && (
                  <Button variant="outline" onClick={() => setSearchTerm('')}>Clear Search</Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {completedQuizzes.length > 0 ? (
              sortByDate(applySearch(completedQuizzes)).map((quiz) => (
                <Card key={quiz._id || quiz.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{quiz.subject}</CardTitle>
                    <p className="text-muted-foreground">Completed on {quiz.date}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-medium mb-2 line-clamp-2">{quiz.name}</p>
                      {quiz.score !== undefined && quiz.maxScore !== undefined && (
                        <div className="flex justify-between">
                          <span>Score:</span>
                          <span className="font-medium">{quiz.score}/{quiz.maxScore}</span>
                        </div>
                      )}
                      {quiz.timeSpent && (
                        <div className="flex justify-between">
                          <span>Time spent:</span>
                          <span className="font-medium">{quiz.timeSpent} minutes</span>
                        </div>
                      )}
                      {quiz.notes && (
                        <div className="pt-2">
                          <span className="text-sm text-muted-foreground">{quiz.notes}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button 
                      variant="outline" 
                      onClick={() => handleStartQuiz(quiz)}
                    >
                      View Quiz
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          onClick={() => handleAddScore(quiz)}
                        >
                          Update Score
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Quiz Score</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <p className="font-medium">{quiz.name}</p>
                            <p className="text-sm text-muted-foreground">{quiz.subject}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label htmlFor="score-update" className="text-sm font-medium">Your Score</label>
                              <Input 
                                id="score-update" 
                                type="number" 
                                value={scoreInput} 
                                onChange={(e) => setScoreInput(e.target.value)}
                                placeholder={quiz.score ? quiz.score.toString() : ""}
                              />
                            </div>
                            <div className="space-y-2">
                              <label htmlFor="maxScore-update" className="text-sm font-medium">Max Score</label>
                              <Input 
                                id="maxScore-update" 
                                type="number" 
                                value={maxScoreInput} 
                                onChange={(e) => setMaxScoreInput(e.target.value)}
                                placeholder={quiz.maxScore ? quiz.maxScore.toString() : ""}
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
                              placeholder={quiz.timeSpent ? quiz.timeSpent.toString() : ""}
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="notes-update" className="text-sm font-medium">Notes (Optional)</label>
                            <Input 
                              id="notes-update" 
                              value={notesInput} 
                              onChange={(e) => setNotesInput(e.target.value)}
                              placeholder={quiz.notes || "Any notes about your performance..."}
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
                <p className="text-muted-foreground mb-2">No completed quizzes yet.</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Take quizzes and add your scores to track your progress!
                </p>
                <Button onClick={() => window.location.href = '/quizzes?tab=all'}>
                  Browse Quizzes
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}