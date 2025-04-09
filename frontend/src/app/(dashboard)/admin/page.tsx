// frontend/src/app/(dashboard)/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Add this import
import { adminAPI } from "@/lib/api";
import { BookOpen, FileQuestion, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation"; // Add this import

interface DashboardData {
  stats: {
    subjectCount: number;
    quizCount: number;
    testCount: number;
  };
  upcomingQuizzes: any[];
  upcomingTests: any[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter(); // Add this

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashboardData = await adminAPI.getDashboard();
        setData(dashboardData);
      } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage subjects, quizzes, and test series.</p>
      </div>

      {/* Add navigation buttons */}
      <div className="flex flex-wrap gap-4 mt-4 mb-6">
        <Button 
          onClick={() => router.push('/admin/subjects')} 
          variant="outline" 
          className="flex items-center gap-2"
        >
          <BookOpen className="h-4 w-4" />
          Manage Subjects
        </Button>
        
        <Button 
          onClick={() => router.push('/admin/quizzes')} 
          variant="outline" 
          className="flex items-center gap-2"
        >
          <FileQuestion className="h-4 w-4" />
          Manage Quizzes
        </Button>
        
        <Button 
          onClick={() => router.push('/admin/tests')} 
          variant="outline" 
          className="flex items-center gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          Manage Tests
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.subjectCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">Total subjects in the system</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quizzes</CardTitle>
            <FileQuestion className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.quizCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">Total quizzes available</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Series</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.testCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">Total test series available</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Quizzes</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.upcomingQuizzes && data.upcomingQuizzes.length > 0 ? (
              <div className="space-y-4">
                {data.upcomingQuizzes.map((quiz) => (
                  <div key={quiz._id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-medium">{quiz.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(quiz.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-sm">
                      {quiz.subject}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming quizzes</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tests</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.upcomingTests && data.upcomingTests.length > 0 ? (
              <div className="space-y-4">
                {data.upcomingTests.map((test) => (
                  <div key={test._id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-medium">{test.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(test.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-sm">
                      {test.relatedSubjects.map((s: any) => s.name).join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming tests</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}