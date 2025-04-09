// frontend/src/app/(dashboard)/admin/tests/page.tsx
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

export default function AdminTests() {
  const [tests, setTests] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list");
  const [editingTest, setEditingTest] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    link: "",
    date: "",
    topics: ""
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [testsData, subjectsData] = await Promise.all([
        adminAPI.getTests(),
        subjectsAPI.getAllSubjects()
      ]);
      setTests(testsData);
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
      topics: ""
    });
    setFile(null);
    setEditingTest(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Identify related subjects based on topics
      const topics = formData.topics.split(',').map(t => t.trim());
      const relatedSubjectIds = subjects
        .filter(s => topics.some(t => t.includes(s.name)))
        .map(s => s._id);
      
      const testData = {
        name: formData.name,
        link: formData.link,
        date: new Date(formData.date),
        topics,
        relatedSubjects: relatedSubjectIds
      };
      
      if (editingTest) {
        const updatedTest = await adminAPI.updateTest(editingTest._id, testData);
        setTests(prev => prev.map(t => t._id === editingTest._id ? updatedTest : t));
        toast.success("Test updated successfully");
      } else {
        const newTest = await adminAPI.createTest(testData);
        setTests(prev => [...prev, newTest]);
        toast.success("Test added successfully");
      }
      
      resetForm();
      setActiveTab("list");
    } catch (error) {
      console.error("Error saving test:", error);
      toast.error("Failed to save test");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this test?")) {
      return;
    }
    
    try {
      await adminAPI.deleteTest(id);
      setTests(prev => prev.filter(t => t._id !== id));
      toast.success("Test deleted successfully");
    } catch (error) {
      console.error("Error deleting test:", error);
      toast.error("Failed to delete test");
    }
  };

  const handleEdit = (test: any) => {
    setEditingTest(test);
    setFormData({
      name: test.name,
      link: test.link,
      date: new Date(test.date).toISOString().split('T')[0],
      topics: test.topics.join(', ')
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
      
      const result = await adminAPI.uploadTests(formData);
      await fetchData(); // Refresh the data
      
      toast.success(result.msg || "Tests uploaded successfully");
      setFile(null);
      setActiveTab("list");
    } catch (error) {
      console.error("Error uploading tests:", error);
      toast.error("Failed to upload tests");
    } finally {
      setUploading(false);
    }
  };

  if (loading && tests.length === 0) {
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
          <h1 className="text-3xl font-bold mb-2">Manage Test Series</h1>
          <p className="text-muted-foreground">Add, edit, or import test series from CSV</p>
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
            Add Test
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
              <CardTitle>All Test Series ({tests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Related Subjects</TableHead>
                      <TableHead>Topics</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tests.map((test) => (
                      <TableRow key={test._id}>
                        <TableCell>
                          <div className="font-medium">{test.name}</div>
                        </TableCell>
                        <TableCell>{new Date(test.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {test.relatedSubjects?.map((s: any) => s.name).join(', ') || 'None'}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {test.topics.join(', ')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" asChild>
                              <a href={test.link} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(test)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(test._id)}>
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
              <CardTitle>{editingTest ? "Edit Test" : "Add New Test"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Test Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Test name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="link">Test Link</Label>
                    <Input
                      id="link"
                      name="link"
                      value={formData.link}
                      onChange={handleInputChange}
                      placeholder="https://example.com/test"
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topics">Topics (comma separated)</Label>
                  <Input
                    id="topics"
                    name="topics"
                    value={formData.topics}
                    onChange={handleInputChange}
                    placeholder="e.g. Database, Normalization, SQL"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Topics are used to automatically link this test to relevant subjects
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    resetForm();
                    setActiveTab("list");
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingTest ? "Update Test" : "Add Test"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Import Tests from CSV</CardTitle>
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
                    <li>Exam Name - Name of the test</li>
                    <li>Test Link - URL to the test</li>
                    <li>Exam Date - Format: "May 15, 2024"</li>
                    <li>Topics - Comma-separated list of topics</li>
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