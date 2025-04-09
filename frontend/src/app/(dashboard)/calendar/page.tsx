"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { format, getDay, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isSameDay } from "date-fns";
import { scheduleAPI, testsAPI } from "@/lib/api";
import { toast } from "sonner";
import { Clock, Award, FileQuestion, BookOpen, HomeIcon } from "lucide-react";

interface ScheduleItem {
  _id: string;
  type: 'lecture' | 'quiz' | 'homework' | 'pyq';
  name: string;
  moduleName: string;
  subjectName: string;
  duration: number;
  completed: boolean;
  date: string;
}

interface TestItem {
  _id: string;
  name: string;
  date: string;
  duration: number;
  subjectName?: string;
  completed: boolean;
  isFullTest: boolean;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Format current date for display
  const formattedDate = format(selectedDate, "MMMM d, yyyy");
  
  // Generate days for calendar
  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
  
  // Calculate offset for the first day of month
  const startOffset = getDay(firstDayOfMonth);
  
  // Create day names array
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  // Previous and next month handlers
  const prevMonth = () => {
    const prevMonth = new Date(currentDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentDate(prevMonth);
  };
  
  const nextMonth = () => {
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentDate(nextMonth);
  };
  
  // Fetch schedule and test data
  useEffect(() => {
    const fetchCalendarData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch schedule data
        try {
          console.log("Fetching schedule data from today to deadline");
          
          // We don't need to generate a schedule on every page load
          // Just use the existing schedule data
          let schedule;
          try {
            schedule = await scheduleAPI.getUserSchedule();
          } catch (error) {
            console.error("Error fetching schedule data:", error);
            schedule = []; // Default to empty array if fetch fails
          }
          if (schedule && Array.isArray(schedule)) {
            try {
              // Map the data with better error handling
              const mappedSchedule = schedule.map((item: any) => {
                if (!item) return []; // Skip null/undefined items and return empty array for flattening
                
                // Check if the item has plannedSessions (if it's a schedule object)
                if (item.plannedSessions && Array.isArray(item.plannedSessions)) {
                  // Flatten the sessions into individual items
                  return item.plannedSessions
                    .filter((session: any) => !!session) // Filter out null/undefined sessions
                    .map((session: any) => ({
                      _id: session._id || `session-${Math.random()}`,
                      date: item.date || new Date().toISOString(),
                      type: session.type || 'lecture',
                      name: session.name || 'Study Session',
                      moduleName: session.moduleName || '',
                      subjectName: session.subjectName || '',
                      duration: Number.isFinite(session.duration) ? session.duration : 0,
                      completed: !!session.completed
                    }));
                } else {
                  // It's a regular item
                  return [{
                    _id: item._id || `item-${Math.random()}`,
                    date: item.date || new Date().toISOString(),
                    type: item.type || 'lecture',
                    name: item.name || 'Study Session',
                    moduleName: item.moduleName || '',
                    subjectName: item.subjectName || '',
                    duration: Number.isFinite(item.duration) ? item.duration : 0,
                    completed: !!item.completed
                  }];
                }
              });
              
              // Flatten the array if needed (in case we have nested arrays from schedules with plannedSessions)
              const flattenedSchedule = mappedSchedule.flat().filter(Boolean); // Remove any null/undefined items
              setScheduleData(flattenedSchedule);
              console.log(`Found ${flattenedSchedule.length} schedule items`);
            } catch (mappingError) {
              console.error("Error mapping schedule data:", mappingError);
              setScheduleData([]);
            }
          } else {
            console.log("No schedule data found or invalid format", schedule);
            setScheduleData([]);
          }
        } catch (error) {
          console.error("Error fetching schedule:", error);
          setScheduleData([]);
        }
        
        // Fetch upcoming tests
        try {
          let upcomingTests;
          try {
            upcomingTests = await testsAPI.getUpcomingTests();
          } catch (testError) {
            console.error("Error fetching upcoming tests:", testError);
            upcomingTests = [];
          }
          
          if (upcomingTests && Array.isArray(upcomingTests)) {
            // Map the data with better error handling
            const mappedTests = upcomingTests.map((test: any) => {
              if (!test) return null; // Skip null/undefined items
              
              return {
                _id: test._id || `test-${Math.random()}`,
                name: test.name || 'Untitled Test',
                date: test.date || new Date().toISOString(),
                duration: test.duration || 180,
                subjectName: test.subject?.name || 'General',
                completed: test.completed || false,
                isFullTest: test.isFullTest || false
              };
            }).filter(Boolean); // Remove any null items
            
            setTests(mappedTests);
          } else {
            console.log("No test data found or invalid format", upcomingTests);
            setTests([]);
          }
        } catch (error) {
          console.error("Error processing tests data:", error);
          setTests([]);
        }
      } catch (error) {
        console.error('Error fetching calendar data:', error);
        toast.error('Failed to load calendar data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCalendarData();
  }, []);
  
  // Check if date has events with error handling
  const hasEvent = (date: Date) => {
    try {
      // Check schedules
      const hasSchedule = scheduleData.some(item => {
        if (!item || !item.date) return false;
        
        try {
          const itemDate = typeof item.date === 'string' 
            ? parseISO(item.date) 
            : new Date(item.date);
          return isSameDay(itemDate, date);
        } catch (parseError) {
          console.warn("Error parsing schedule date:", parseError);
          return false;
        }
      });
      
      // Check tests
      const hasTest = tests.some(test => {
        if (!test || !test.date) return false;
        
        try {
          const testDate = typeof test.date === 'string' 
            ? parseISO(test.date) 
            : new Date(test.date);
          return isSameDay(testDate, date);
        } catch (parseError) {
          console.warn("Error parsing test date:", parseError);
          return false;
        }
      });
      
      return hasSchedule || hasTest;
    } catch (error) {
      console.error("Error checking events for date:", error);
      return false;
    }
  };
  
  const selectDate = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div className="container max-w-6xl px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Study Calendar</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Schedule for {format(currentDate, "MMMM yyyy")}</CardTitle>
            <div className="flex space-x-2">
              <button
                onClick={prevMonth}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 w-9"
              >
                &lt;
              </button>
              <button
                onClick={nextMonth}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 w-9"
              >
                &gt;
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="custom-calendar">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day) => (
                  <div key={day} className="text-center text-sm font-medium py-1">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before the first day of the month */}
                {Array.from({ length: startOffset }).map((_, i) => (
                  <div key={`empty-${i}`} className="py-2 px-1"></div>
                ))}
                
                {/* Calendar days */}
                {daysInMonth.map((day) => {
                  try {
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isSelected = day.toDateString() === selectedDate.toDateString();
                    const dayHasEvent = hasEvent(day);
                    
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => selectDate(day)}
                        className={`h-10 w-full rounded-md p-0 font-normal text-center ${
                          isSelected 
                            ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                            : isToday 
                            ? "bg-accent text-accent-foreground" 
                            : "hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center h-full">
                          <span>{format(day, "d")}</span>
                          {dayHasEvent && (
                            <div className="size-1 rounded-full bg-primary mt-0.5"></div>
                          )}
                        </div>
                      </button>
                    );
                  } catch (error) {
                    console.error("Error rendering calendar day:", error);
                    // Return a fallback empty cell on error
                    return <div key={`error-${Math.random()}`} className="py-2 px-1"></div>;
                  }
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Events on {formattedDate}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <>
                    {/* Display schedule items */}
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold mb-2">Study Schedule</h3>
                      {scheduleData
                        .filter(item => {
                          if (!item || !item.date) return false;
                          try {
                            const itemDate = typeof item.date === 'string' 
                              ? parseISO(item.date) 
                              : new Date(item.date);
                            return isSameDay(itemDate, selectedDate);
                          } catch (error) {
                            console.warn("Error parsing schedule date for filtering:", error);
                            return false;
                          }
                        })
                        .length > 0 ? (
                          // Group the items by subject
                          Object.entries(
                            scheduleData
                              .filter(item => {
                                if (!item || !item.date) return false;
                                try {
                                  const itemDate = typeof item.date === 'string' 
                                    ? parseISO(item.date) 
                                    : new Date(item.date);
                                  return isSameDay(itemDate, selectedDate);
                                } catch (error) {
                                  console.warn("Error parsing schedule date for filtering:", error);
                                  return false;
                                }
                              })
                              .reduce((groups: Record<string, ScheduleItem[]>, item) => {
                                const key = item.subjectName || 'Other';
                                if (!groups[key]) groups[key] = [];
                                groups[key].push(item);
                                return groups;
                              }, {})
                          ).map(([subject, items]) => (
                            <div key={subject} className="mb-3">
                              <h4 className="text-xs font-medium text-muted-foreground mb-1">{subject}</h4>
                              {items.map(item => (
                                <div key={item._id} className="border-l-4 border-primary pl-4 py-2 mb-2 bg-muted/20 rounded-sm">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                      {item.type === 'lecture' && <BookOpen className="h-4 w-4 mr-2 text-blue-500" />}
                                      {item.type === 'quiz' && <FileQuestion className="h-4 w-4 mr-2 text-green-500" />}
                                      {item.type === 'homework' && <HomeIcon className="h-4 w-4 mr-2 text-orange-500" />}
                                      {item.type === 'pyq' && <Award className="h-4 w-4 mr-2 text-purple-500" />}
                                      <p className="font-medium">{item.name}</p>
                                    </div>
                                    <div className="flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      <span className="text-xs">{Math.floor(item.duration / 60)}h {item.duration % 60}m</span>
                                    </div>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {item.moduleName}
                                  </p>
                                  <p className="text-xs mt-1">
                                    {item.completed ? 
                                      <span className="text-green-600 flex items-center gap-1">
                                        <span className="size-2 bg-green-600 rounded-full"></span> Completed
                                      </span> : 
                                      <span className="text-yellow-600 flex items-center gap-1">
                                        <span className="size-2 bg-yellow-600 rounded-full"></span> Pending
                                      </span>
                                    }
                                  </p>
                                </div>
                              ))}
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-sm">No study sessions scheduled for this day</p>
                        )}
                    </div>
                    
                    {/* Display tests */}
                    {tests.filter(test => {
                      if (!test || !test.date) return false;
                      try {
                        const testDate = typeof test.date === 'string' 
                          ? parseISO(test.date) 
                          : new Date(test.date);
                        return isSameDay(testDate, selectedDate);
                      } catch (error) {
                        console.warn("Error parsing test date for filtering:", error);
                        return false;
                      }
                    }).length > 0 && (
                      <div className="mb-2">
                        <h3 className="text-sm font-semibold mb-2">Tests</h3>
                        {tests
                          .filter(test => {
                            if (!test || !test.date) return false;
                            try {
                              const testDate = typeof test.date === 'string' 
                                ? parseISO(test.date) 
                                : new Date(test.date);
                              return isSameDay(testDate, selectedDate);
                            } catch (error) {
                              console.warn("Error parsing test date for filtering:", error);
                              return false;
                            }
                          })
                          .map(test => (
                            <div key={test._id} className="border-l-4 border-red-500 pl-4 py-2 bg-red-50 dark:bg-red-950/20 rounded-sm mb-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Award className="h-4 w-4 mr-2 text-red-500" />
                                  <p className="font-medium">{test.name}</p>
                                </div>
                                <div className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1 text-red-500" />
                                  <span className="text-xs">{Math.floor(test.duration / 60)}h {test.duration % 60}m</span>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {test.subjectName || 'Full GATE Test'}
                              </p>
                              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                <span className="size-2 bg-red-600 rounded-full"></span> 
                                {test.isFullTest ? 'Full Test' : 'Subject Test'}
                              </p>
                            </div>
                          ))
                        }
                      </div>
                    )}
                    
                    {/* If no events */}
                    {!scheduleData.some(item => {
                      if (!item || !item.date) return false;
                      try {
                        const itemDate = typeof item.date === 'string' 
                          ? parseISO(item.date) 
                          : new Date(item.date);
                        return isSameDay(itemDate, selectedDate);
                      } catch (error) {
                        return false;
                      }
                    }) && !tests.some(test => {
                      if (!test || !test.date) return false;
                      try {
                        const testDate = typeof test.date === 'string' 
                          ? parseISO(test.date) 
                          : new Date(test.date);
                        return isSameDay(testDate, selectedDate);
                      } catch (error) {
                        return false;
                      }
                    }) && (
                      <p className="text-muted-foreground">No events scheduled for this day</p>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : tests.length > 0 ? (
                  tests
                    .filter(test => !!test && !!test.date) // Filter out invalid tests
                    .sort((a, b) => {
                      try {
                        const dateA = new Date(a.date).getTime();
                        const dateB = new Date(b.date).getTime();
                        return Number.isNaN(dateA) || Number.isNaN(dateB) 
                          ? 0 // If invalid dates, don't change order
                          : dateA - dateB;
                      } catch (error) {
                        console.warn("Error sorting test dates:", error);
                        return 0; // Don't change order on error
                      }
                    })
                    .slice(0, 3) // Show only the next 3 tests
                    .map(test => {
                      try {
                        const testDate = typeof test.date === 'string'
                          ? parseISO(test.date)
                          : new Date(test.date);
                        
                        // Default values if parse fails
                        let month = 'N/A';
                        let day = '??';
                        
                        try {
                          month = format(testDate, 'MMM').toUpperCase();
                          day = format(testDate, 'd');
                        } catch (formatError) {
                          console.warn("Error formatting test date:", formatError);
                        }
                        
                        return (
                          <div key={test._id} className="flex items-center gap-4">
                            <div className="flex flex-col items-center justify-center bg-muted p-2 rounded-md w-14 h-14">
                              <span className="text-sm font-bold">{month}</span>
                              <span className="text-xl font-bold">{day}</span>
                            </div>
                            <div>
                              <p className="font-medium">{test.name || 'Untitled Test'}</p>
                              <p className="text-sm text-muted-foreground">
                                {test.subjectName || 'Full GATE Test'} • {Math.floor((test.duration || 0) / 60)}h {(test.duration || 0) % 60}m
                              </p>
                            </div>
                          </div>
                        );
                      } catch (error) {
                        console.error("Error rendering test item:", error);
                        return null; // Skip on error
                      }
                    })
                    .filter(Boolean) // Remove any null entries
                ) : (
                  <p className="text-muted-foreground">No upcoming tests scheduled</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}