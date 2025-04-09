// frontend/src/app/(dashboard)/admin/quizzes/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminAPI, subjectsAPI } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Edit, Trash, Upload, Calendar, File, ExternalLink } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminQuizzes() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list");
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    link: "",
    date: "",
    subject: "",
    topics: "",
    remarks: ""
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quizzesData, subjectsData] = await Promise.all([
        adminAPI.getQuizzes(),
        subjectsAPI.getAllSubjects()
      ]);
      setQuizzes(quizzesData);
      setSubjects(subjectsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      link: "",
      date: "",
      subject: "",
      topics: "",
      remarks: ""
    });
    setFile(null);
    setEditingQuiz(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const quizData = {
        name: formData.name,
        link: formData.link,
        date: new Date(formData.date),
        subject: formData.subject,
        topics: formData.topics.split(',').map(t => t.trim()),
        remarks: formData.remarks,
        relatedSubjects: subjects
          .filter(s => formData.subject.includes(s.name) || formData.topics.includes(s.name))
          .map(s => s._id)
      };
      
      if (editingQuiz) {
        const updatedQuiz = await adminAPI.updateQuiz(editingQuiz._id, quizData);
        setQuizzes(prev => prev.map(q => q._id === editingQuiz._id ? updatedQuiz : q));
        toast.success("Quiz updated successfully");
      } else {
        const newQuiz = await adminAPI.createQuiz(quizData);
        setQuizzes(prev => [...prev, newQuiz]);
        toast.success("Quiz added successfully");
      }
      
      resetForm();
      setActiveTab("list");
    } catch (error) {
      console.error("Error saving quiz:", error);
      toast.error("Failed to save quiz");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quiz?")) {
      return;
    }
    
    try {
      await adminAPI.deleteQuiz(id);
      setQuizzes(prev => prev.filter(q => q._id !== id));
      toast.success("Quiz deleted successfully");
    } catch (error) {
      console.error("Error deleting quiz:", error);
      toast.error("Failed to delete quiz");
    }
  };

  const handleEdit = (quiz: any) => {
    setEditingQuiz(quiz);
    setFormData({
      name: quiz.name,
      link: quiz.link,
      date: new Date(quiz.date).toISOString().split('T')[0],
      subject: quiz.subject,
      topics: quiz.topics.join(', '),
      remarks: quiz.remarks || ""
    });
    setActiveTab("form");
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast.error("Please select a CSV file to upload");
      return;
    }
    
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const result = await adminAPI.uploadQuizzes(formData);
      await fetchData(); // Refresh the data
      
      toast.success(result.msg || "Quizzes uploaded successfully");
      setFile(null);
      setActiveTab("list");
    } catch (error) {
      console.error("Error uploading quizzes:", error);
      toast.error("Failed to upload quizzes");
    } finally {
      setUploading(false);
    }
  };

  if (loading && quizzes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Manage Quizzes</h1>
          <p className="text-muted-foreground">Add, edit, or import quizzes from CSV</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={activeTab === "list" ? "default" : "outline"} 
            onClick={() => setActiveTab("list")}
          >
            List View
          </Button>
          <Button 
            variant={activeTab === "form" ? "default" : "outline"} 
            onClick={() => {
              setActiveTab("form");
              resetForm();
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Quiz
          </Button>
          <Button 
            variant={activeTab === "upload" ? "default" : "outline"}
            onClick={() => setActiveTab("upload")}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsContent value="list" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>All Quizzes ({quizzes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Topics</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quizzes.map((quiz) => (
                      <TableRow key={quiz._id}>
                        <TableCell>
                          <div className="font-medium">{quiz.name}</div>
                        </TableCell>
                        <TableCell>{quiz.subject}</TableCell>
                        <TableCell>{new Date(quiz.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {quiz.topics.join(', ')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" asChild>
                              <a href={quiz.link} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(quiz)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(quiz._id)}>
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="form" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>{editingQuiz ? "Edit Quiz" : "Add New Quiz"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Quiz Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Quiz name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="link">Quiz Link</Label>
                    <Input
                      id="link"
                      name="link"
                      value={formData.link}
                      onChange={handleInputChange}
                      placeholder="https://example.com/quiz"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        className="pl-10"
                        value={formData.date}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="e.g. Database Management Systems"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topics">Topics (comma separated)</Label>
                  <Input
                    id="topics"
                    name="topics"
                    value={formData.topics}
                    onChange={handleInputChange}
                    placeholder="e.g. SQL, Normalization, Indexing"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Input
                    id="remarks"
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    placeholder="Additional information about the quiz"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    resetForm();
                    setActiveTab("list");
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingQuiz ? "Update Quiz" : "Add Quiz"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Import Quizzes from CSV</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-6">
                  <File className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="mb-1 font-medium">Upload CSV File</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Drag and drop or click to browse
                  </p>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="max-w-sm"
                  />
                  {file && (
                    <p className="mt-2 text-sm">Selected: {file.name}</p>
                  )}
                </div>

                <div className="bg-muted p-4 rounded-md">
                  <h3 className="font-medium mb-2">CSV Format Guidelines</h3>
                  <p className="text-sm mb-2">Your CSV should include these columns:</p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    <li>Exam Name - Name of the quiz</li>
                    <li>Quiz Links - URL to the quiz</li>
                    <li>Exam Date - Format: "Thursday, 1 August 2024" or "August 31, 2024"</li>
                    <li>Subject - Subject name</li>
                    <li>Topics - Comma-separated list of topics</li>
                    <li>Remarks (optional) - Additional information</li>
                  </ul>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setFile(null);
                    setActiveTab("list");
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!file || uploading}>
                    {uploading ? "Uploading..." : "Upload CSV"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}