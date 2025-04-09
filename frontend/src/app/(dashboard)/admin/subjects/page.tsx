// frontend/src/app/(dashboard)/admin/subjects/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminAPI } from "@/lib/api";
import { toast } from "sonner";
import { Edit, Trash, Clock, Book, FileQuestion, HomeIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Type definitions
interface ContentItem {
  _id?: string;
  type: 'lecture' | 'quiz' | 'homework';
  name: string;
  durationMinutes: number;
  duration?: string;
  link?: string;
  description?: string;
  questionCount?: number;
}

interface Module {
  _id?: string;
  name: string;
  content: ContentItem[];
}

interface Subject {
  _id: string;
  name: string;
  totalDuration: number;
  priority: number;
  modules: Module[];
  pyqs: {
    count: number;
    estimatedDuration: number;
  };
}

export default function AdminSubjects() {
  // State for subjects list and loading
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Subject form
  interface SubjectForm {
    name: string;
    pyqCount: number;
    priority: number;
  }
  
  const [subjectForm, setSubjectForm] = useState<SubjectForm>({
    name: "",
    pyqCount: 0,
    priority: 5 // Default value, not shown to admin but needed for API
  });
  
  // Module form
  interface ModuleForm {
    name: string;
  }
  
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [moduleForm, setModuleForm] = useState<ModuleForm>({
    name: ""
  });
  
  // Content form
  interface ContentFormData {
    type: 'lecture' | 'quiz' | 'homework';
    name: string;
    durationMinutes: number;
    duration: string;
    link: string;
    description: string;
    questionCount: number;
  }
  
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [contentForm, setContentForm] = useState<ContentFormData>({
    type: "lecture",
    name: "",
    durationMinutes: 30,
    duration: "0:30", // HH:MM format for easier input
    link: "",
    description: "",
    questionCount: 0
  });
  
  // UI state
  const [activeTab, setActiveTab] = useState("subject");
  const [showForm, setShowForm] = useState(false);
  
  // Edit dialog states
  const [editSubjectDialog, setEditSubjectDialog] = useState(false);
  const [editModuleDialog, setEditModuleDialog] = useState(false);
  const [editContentDialog, setEditContentDialog] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
  const [currentModule, setCurrentModule] = useState<Module | null>(null);
  const [currentContent, setCurrentContent] = useState<ContentItem | null>(null);
  
  // Delete dialog states
  const [deleteSubjectDialog, setDeleteSubjectDialog] = useState(false);
  const [deleteModuleDialog, setDeleteModuleDialog] = useState(false);
  const [deleteContentDialog, setDeleteContentDialog] = useState(false);
  
  // Edit forms
  interface EditSubjectForm {
    name: string;
    pyqCount: number;
    priority: number;
  }
  
  const [editSubjectForm, setEditSubjectForm] = useState<EditSubjectForm>({
    name: "",
    pyqCount: 0,
    priority: 5 // Default value, not shown to admin but needed for API
  });
  
  const [editModuleForm, setEditModuleForm] = useState<ModuleForm>({
    name: ""
  });
  
  const [editContentForm, setEditContentForm] = useState<ContentFormData>({
    type: "lecture",
    name: "",
    durationMinutes: 30,
    duration: "0:30", // HH:MM format for easier input
    link: "",
    description: "",
    questionCount: 0
  });
  
  // Fetch subjects on component mount
  useEffect(() => {
    fetchSubjects();
  }, []);
  
  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getSubjects();
      setSubjects(data);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      toast.error("Failed to fetch subjects");
    } finally {
      setLoading(false);
    }
  };
  
  // Handle subject form inputs
  const handleSubjectInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSubjectForm({
      ...subjectForm,
      [name]: name === 'priority' || name === 'pyqCount' ? parseInt(value) || 0 : value
    });
  };
  
  // Add a new subject
  const addSubject = async () => {
    try {
      const newSubject = await adminAPI.createSubject({
        name: subjectForm.name,
        priority: 5, // Default priority for new subjects (users will set their own)
        modules: [],
        pyqs: {
          count: subjectForm.pyqCount,
          estimatedDuration: Math.ceil(subjectForm.pyqCount * 2.76923076923)
        }
      });
      
      setSubjects([...subjects, newSubject]);
      toast.success("Subject added successfully");
      setSubjectForm({ name: "", pyqCount: 0, priority: 5 });
    } catch (error) {
      console.error("Error adding subject:", error);
      toast.error("Failed to add subject");
    }
  };
  
  // Handle module form inputs
  const handleModuleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setModuleForm({
      ...moduleForm,
      [name]: value
    });
  };
  
  // Add a new module to selected subject
  const addModule = async () => {
    if (!selectedSubject) {
      toast.error("Please select a subject first");
      return;
    }
    
    try {
      const updatedSubject = await adminAPI.addModuleToSubject(
        selectedSubject._id,
        { name: moduleForm.name }
      );
      
      // Update subjects list
      setSubjects(subjects.map((s: Subject) => s._id === selectedSubject._id ? updatedSubject : s));
      // Update selected subject with latest data
      setSelectedSubject(updatedSubject);
      toast.success("Module added successfully");
      setModuleForm({ name: "" });
    } catch (error) {
      console.error("Error adding module:", error);
      toast.error("Failed to add module");
    }
  };
  
  // Handle content form inputs
  const handleContentInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setContentForm({
      ...contentForm,
      [name]: name === 'durationMinutes' || name === 'questionCount' ? parseInt(value) || 0 : value
    });
    
    // Update duration format if durationMinutes changes
    if (name === 'durationMinutes') {
      const minutes = parseInt(value) || 0;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      setContentForm(prev => ({
        ...prev,
        duration: `${hours}:${mins}`
      }));
    }
    
    // Update duration if questionCount changes for homework
    if (name === 'questionCount' && contentForm.type === 'homework') {
      const questionCount = parseInt(value) || 0;
      const calculatedDuration = Math.ceil(questionCount * 2.76923076923);
      
      // Update durationMinutes and duration format
      const hours = Math.floor(calculatedDuration / 60);
      const mins = calculatedDuration % 60;
      
      setContentForm(prev => ({
        ...prev,
        durationMinutes: calculatedDuration,
        duration: `${hours}:${mins}`
      }));
    }
  };
  
  // Handle content type selection
  const handleContentTypeChange = (value: string) => {
    // Reset type-specific fields
    const updatedForm = {
      ...contentForm,
      type: value as 'lecture' | 'quiz' | 'homework',
      link: value === 'quiz' ? contentForm.link : '',
      description: '',
      questionCount: value === 'homework' ? contentForm.questionCount : 0
    };
    
    // If switching to homework, initialize with a default durationMinutes
    if (value === 'homework' && updatedForm.questionCount > 0) {
      const calculatedDuration = Math.ceil(updatedForm.questionCount * 2.76923076923);
      updatedForm.durationMinutes = calculatedDuration;
      
      // Update duration format
      const hours = Math.floor(calculatedDuration / 60);
      const mins = calculatedDuration % 60;
      updatedForm.duration = `${hours}:${mins}`;
    }
    
    setContentForm(updatedForm);
  };
  
  // Add new content to selected module
  const addContent = async () => {
    if (!selectedSubject || !selectedModule) {
      toast.error("Please select a subject and module first");
      return;
    }
    
    try {
      console.log("Adding content with:", {
        subjectId: selectedSubject._id,
        moduleId: selectedModule._id,
        contentData: contentForm
      });
      
      // Prepare content data
      const contentData: any = {
        type: contentForm.type,
        name: contentForm.name,
        durationMinutes: contentForm.durationMinutes
      };
      
      // Add type-specific fields
      if (contentForm.type === 'lecture') {
        contentData.duration = contentForm.duration;
      } else if (contentForm.type === 'quiz') {
        contentData.link = contentForm.link;
      } else if (contentForm.type === 'homework') {
        contentData.questionCount = contentForm.questionCount;
        // Calculate duration based on question count
        contentData.durationMinutes = Math.ceil(contentForm.questionCount * 2.76923076923);
      }
      
      // Make API call
      const updatedSubject = await adminAPI.addContentToModule(
        selectedSubject._id,
        selectedModule._id as string,
        contentData
      );
      
      // Update subjects list
      setSubjects(subjects.map((s: Subject) => s._id === selectedSubject._id ? updatedSubject : s));
      
      // Update selected subject and module with latest data
      setSelectedSubject(updatedSubject);
      const updatedModule = updatedSubject.modules.find((m: Module) => m._id === selectedModule._id);
      if (updatedModule) {
        setSelectedModule(updatedModule);
      }
      
      toast.success("Content added successfully");
      
      // Reset content form
      setContentForm({
        type: "lecture",
        name: "",
        durationMinutes: 30,
        duration: "0:30",
        link: "",
        description: "",
        questionCount: 0
      });
    } catch (error) {
      console.error("Error adding content:", error);
      toast.error("Failed to add content");
    }
  };
  
  // Handle edit subject button click
  const handleEditSubject = (subject: Subject) => {
    setCurrentSubject(subject);
    const priority = typeof subject.priority === 'number' ? subject.priority : 5;
    setEditSubjectForm({
      name: subject.name,
      pyqCount: subject.pyqs?.count || 0,
      priority: priority // Keep existing priority
    });
    setEditSubjectDialog(true);
  };
  
  // Handle update subject
  const handleUpdateSubject = async () => {
    if (!currentSubject) return;
    
    try {
      const updatedSubject = await adminAPI.updateSubject(currentSubject._id, {
        name: editSubjectForm.name,
        priority: editSubjectForm.priority, // Use priority from form state
        pyqs: {
          count: editSubjectForm.pyqCount,
          estimatedDuration: Math.ceil(editSubjectForm.pyqCount * 2.76923076923)
        }
      });
      
      // Update subjects list
      setSubjects(subjects.map((s: Subject) => s._id === currentSubject._id ? updatedSubject : s));
      toast.success("Subject updated successfully");
      setEditSubjectDialog(false);
    } catch (error) {
      console.error("Error updating subject:", error);
      toast.error("Failed to update subject");
    }
  };
  
  // Handle delete subject
  const handleDeleteSubject = (subject: Subject) => {
    setCurrentSubject(subject);
    setDeleteSubjectDialog(true);
  };
  
  // Confirm delete subject
  const confirmDeleteSubject = async () => {
    if (!currentSubject) return;
    
    try {
      await adminAPI.deleteSubject(currentSubject._id);
      setSubjects(subjects.filter((s: Subject) => s._id !== currentSubject._id));
      toast.success("Subject deleted successfully");
      setDeleteSubjectDialog(false);
    } catch (error) {
      console.error("Error deleting subject:", error);
      toast.error("Failed to delete subject");
    }
  };
  
  // Handle edit module button click
  const handleEditModule = (subject: Subject, module: Module) => {
    setCurrentSubject(subject);
    setCurrentModule(module);
    setEditModuleForm({
      name: module.name
    });
    setEditModuleDialog(true);
  };
  
  // Handle update module
  const handleUpdateModule = async () => {
    if (!currentSubject || !currentModule) return;
    
    try {
      const updatedSubject = await adminAPI.updateModule(
        currentSubject._id,
        currentModule._id as string,
        { name: editModuleForm.name }
      );
      
      // Update subjects list
      setSubjects(subjects.map((s: Subject) => s._id === currentSubject._id ? updatedSubject : s));
      toast.success("Module updated successfully");
      setEditModuleDialog(false);
    } catch (error) {
      console.error("Error updating module:", error);
      toast.error("Failed to update module");
    }
  };
  
  // Handle delete module
  const handleDeleteModule = (subject: Subject, module: Module) => {
    setCurrentSubject(subject);
    setCurrentModule(module);
    setDeleteModuleDialog(true);
  };
  
  // Confirm delete module
  const confirmDeleteModule = async () => {
    if (!currentSubject || !currentModule) return;
    
    try {
      const updatedSubject = await adminAPI.deleteModule(
        currentSubject._id,
        currentModule._id as string
      );
      
      // Update subjects list
      setSubjects(subjects.map((s: Subject) => s._id === currentSubject._id ? updatedSubject : s));
      toast.success("Module deleted successfully");
      setDeleteModuleDialog(false);
    } catch (error) {
      console.error("Error deleting module:", error);
      toast.error("Failed to delete module");
    }
  };
  
  // Handle edit content button click
  const handleEditContent = (subject: Subject, module: Module, content: ContentItem) => {
    setCurrentSubject(subject);
    setCurrentModule(module);
    setCurrentContent(content);
    
    const editContent: ContentFormData = {
      type: content.type as 'lecture' | 'quiz' | 'homework',
      name: content.name,
      durationMinutes: content.durationMinutes,
      duration: "",
      link: "",
      description: "",
      questionCount: 0
    };
    
    // Set type-specific fields
    if (content.type === 'lecture' && 'duration' in content) {
      // Convert HH:MM:SS to HH:MM format if needed
      const duration = content.duration || "0:00";
      const durationParts = duration.split(':');
      if (durationParts.length === 3) {
        // If format is HH:MM:SS, convert to HH:MM
        const hours = parseInt(durationParts[0]) || 0;
        const minutes = parseInt(durationParts[1]) || 0;
        editContent.duration = `${hours}:${minutes}`;
      } else {
        editContent.duration = duration;
      }
    } else if (content.type === 'quiz' && 'link' in content) {
      editContent.link = content.link || "";
    } else if (content.type === 'homework') {
      if ('questionCount' in content) {
        editContent.questionCount = content.questionCount || 0;
      } else if ('description' in content) {
        // Legacy support for old homework items with description
        editContent.description = content.description || "";
      }
    }
    
    setEditContentForm(editContent);
    setEditContentDialog(true);
  };
  
  // Handle update content
  const handleUpdateContent = async () => {
    if (!currentSubject || !currentModule || !currentContent) return;
    
    try {
      // Prepare content data
      const contentData: any = {
        type: editContentForm.type,
        name: editContentForm.name,
        durationMinutes: editContentForm.durationMinutes
      };
      
      // Add type-specific fields
      if (editContentForm.type === 'lecture') {
        contentData.duration = editContentForm.duration;
      } else if (editContentForm.type === 'quiz') {
        contentData.link = editContentForm.link;
      } else if (editContentForm.type === 'homework') {
        contentData.questionCount = editContentForm.questionCount;
        // Calculate duration based on question count
        contentData.durationMinutes = Math.ceil(editContentForm.questionCount * 2.76923076923);
      }
      
      const updatedSubject = await adminAPI.updateContent(
        currentSubject._id,
        currentModule._id as string,
        currentContent._id as string,
        contentData
      );
      
      // Update subjects list
      setSubjects(subjects.map((s: Subject) => s._id === currentSubject._id ? updatedSubject : s));
      toast.success("Content updated successfully");
      setEditContentDialog(false);
    } catch (error) {
      console.error("Error updating content:", error);
      toast.error("Failed to update content");
    }
  };
  
  // Handle delete content
  const handleDeleteContent = (subject: Subject, module: Module, content: ContentItem) => {
    setCurrentSubject(subject);
    setCurrentModule(module);
    setCurrentContent(content);
    setDeleteContentDialog(true);
  };
  
  // Confirm delete content
  const confirmDeleteContent = async () => {
    if (!currentSubject || !currentModule || !currentContent) return;
    
    try {
      const updatedSubject = await adminAPI.deleteContent(
        currentSubject._id,
        currentModule._id as string,
        currentContent._id as string
      );
      
      // Update subjects list
      setSubjects(subjects.map((s: Subject) => s._id === currentSubject._id ? updatedSubject : s));
      toast.success("Content deleted successfully");
      setDeleteContentDialog(false);
    } catch (error) {
      console.error("Error deleting content:", error);
      toast.error("Failed to delete content");
    }
  };
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };
  
  // Convert duration string to minutes
  const durationToMinutes = (duration: string): number => {
    // Check if format is HH:MM or HH:MM:SS
    const parts = duration.split(':');
    let hours = 0, minutes = 0;
    
    if (parts.length >= 2) {
      hours = parseInt(parts[0]) || 0;
      minutes = parseInt(parts[1]) || 0;
    }
    
    return (hours * 60) + minutes;
  };
  
  const getContentIcon = (type: string) => {
    switch (type) {
      case 'lecture': return <Book className="h-4 w-4 text-blue-500" />;
      case 'quiz': return <FileQuestion className="h-4 w-4 text-green-500" />;
      case 'homework': return <HomeIcon className="h-4 w-4 text-orange-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };
  
  if (loading && subjects.length === 0) {
    return <div className="flex justify-center p-8"><div className="animate-spin h-8 w-8 border-2 border-primary rounded-full border-t-transparent"></div></div>;
  }
  
  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Subjects</h1>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Add Content"}</Button>
      </div>
      
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Content</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="subject">Step 1: Subject</TabsTrigger>
                <TabsTrigger value="module" disabled={!selectedSubject}>Step 2: Module</TabsTrigger>
                <TabsTrigger value="content" disabled={!selectedSubject || !selectedModule}>Step 3: Content</TabsTrigger>
              </TabsList>
              
              <TabsContent value="subject">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Add New Subject</h3>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm mb-1">Subject Name</label>
                        <Input 
                          name="name" 
                          value={subjectForm.name} 
                          onChange={handleSubjectInput} 
                          placeholder="e.g. Computer Networks"
                        />
                      </div>
                      
                      {/* Priority field removed, will be set by users */}
                    </div>
                    
                    <div>
                      <label className="block text-sm mb-1">Previous Year Questions Count</label>
                      <Input 
                        name="pyqCount" 
                        type="number" 
                        min="0" 
                        value={subjectForm.pyqCount} 
                        onChange={handleSubjectInput}
                      />
                      <p className="text-xs mt-1 text-muted-foreground">
                        Estimated Time: {Math.ceil(subjectForm.pyqCount * 2.76923076923)} minutes
                      </p>
                    </div>
                    
                    <div className="flex justify-end mt-3">
                      <Button onClick={addSubject} disabled={!subjectForm.name}>Add Subject</Button>
                    </div>
                  </div>
                  
                  {subjects.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-2">Or Select Existing Subject</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {subjects.map((subject: Subject) => (
                          <div 
                            key={subject._id}
                            className={`p-3 border rounded-md cursor-pointer hover:border-primary transition ${
                              selectedSubject?._id === subject._id ? 'border-primary bg-primary/5' : ''
                            }`}
                            onClick={() => {
                              setSelectedSubject(subject);
                              setActiveTab("module");
                            }}
                          >
                            <div className="font-medium">{subject.name}</div>
                            <div className="flex justify-between text-sm mt-1 text-muted-foreground">
                              <span>{formatDuration(subject.totalDuration)}</span>
                              <span>{subject.modules?.length || 0} modules</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="module">
                {selectedSubject && (
                  <div className="space-y-4">
                    <div className="p-3 bg-muted rounded-md">
                      <p className="font-medium">Selected Subject: {selectedSubject.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Duration: {formatDuration(selectedSubject.totalDuration)} | 
                        Modules: {selectedSubject.modules.length}
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="text-lg font-medium">Add New Module</h3>
                      <div>
                        <label className="block text-sm mb-1">Module Name</label>
                        <Input 
                          name="name" 
                          value={moduleForm.name} 
                          onChange={handleModuleInput} 
                          placeholder="e.g. Introduction to Networks"
                        />
                      </div>
                      
                      <div className="flex justify-end">
                        <Button 
                          variant="outline" 
                          className="mr-2" 
                          onClick={() => {
                            setSelectedSubject(null);
                            setActiveTab("subject");
                          }}
                        >
                          Back
                        </Button>
                        <Button onClick={addModule} disabled={!moduleForm.name}>Add Module</Button>
                      </div>
                    </div>
                    
                    {selectedSubject.modules.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-medium mb-2">Or Select Existing Module</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {selectedSubject.modules.map((module: Module) => (
                            <div 
                              key={module._id}
                              className={`p-3 border rounded-md cursor-pointer hover:border-primary transition ${
                                selectedModule?._id === module._id ? 'border-primary bg-primary/5' : ''
                              }`}
                              onClick={() => {
                                setSelectedModule(module);
                                setActiveTab("content");
                              }}
                            >
                              <div className="font-medium">{module.name}</div>
                              <div className="flex justify-between text-sm mt-1 text-muted-foreground">
                                <span>{module.content.length} items</span>
                                <span>
                                  {formatDuration(module.content.reduce((sum: number, item: ContentItem) => sum + item.durationMinutes, 0))}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="content">
                {selectedSubject && selectedModule && (
                  <div className="space-y-4">
                    <div className="p-3 bg-muted rounded-md">
                      <p className="font-medium">
                        {selectedSubject.name} &rsaquo; {selectedModule.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Content Items: {selectedModule.content.length} | 
                        Duration: {formatDuration(selectedModule.content.reduce((sum: number, item: ContentItem) => sum + item.durationMinutes, 0))}
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="text-lg font-medium">Add New Content</h3>
                      
                      <div>
                        <label className="block text-sm mb-1">Content Type</label>
                        <Select value={contentForm.type} onValueChange={handleContentTypeChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lecture">Lecture</SelectItem>
                            <SelectItem value="quiz">Quiz</SelectItem>
                            <SelectItem value="homework">Homework</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="block text-sm mb-1">Content Name</label>
                        <Input 
                          name="name" 
                          value={contentForm.name} 
                          onChange={handleContentInput} 
                          placeholder="e.g. Introduction to OSI Model"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm mb-1">Duration (HH:MM)</label>
                        <Input 
                          name="duration" 
                          value={contentForm.duration} 
                          onChange={(e) => {
                            // Update duration string
                            const durationStr = e.target.value;
                            setContentForm({
                              ...contentForm,
                              duration: durationStr
                            });
                            
                            // Calculate minutes from duration string
                            const totalMinutes = durationToMinutes(durationStr);
                            
                            // Update durationMinutes if we have a valid duration
                            if (totalMinutes > 0) {
                              setContentForm(prev => ({
                                ...prev,
                                durationMinutes: totalMinutes
                              }));
                            }
                          }}
                          placeholder="0:30"
                        />
                        <p className="text-xs mt-1 text-muted-foreground">
                          {formatDuration(contentForm.durationMinutes)} ({contentForm.durationMinutes} minutes)
                        </p>
                      </div>
                      
                      {contentForm.type === 'quiz' && (
                        <div>
                          <label className="block text-sm mb-1">Quiz Link</label>
                          <Input 
                            name="link" 
                            value={contentForm.link} 
                            onChange={handleContentInput} 
                            placeholder="https://example.com/quiz"
                          />
                        </div>
                      )}
                      
                      {contentForm.type === 'homework' && (
                        <div>
                          <label className="block text-sm mb-1">Number of Questions</label>
                          <Input 
                            name="questionCount" 
                            type="number" 
                            min="0"
                            value={contentForm.questionCount} 
                            onChange={handleContentInput} 
                            placeholder="Number of questions..."
                          />
                          <p className="text-xs mt-1 text-muted-foreground">
                            Estimated Duration: {Math.ceil(contentForm.questionCount * 2.76923076923)} minutes
                          </p>
                        </div>
                      )}
                      
                      <div className="flex justify-end">
                        <Button 
                          variant="outline" 
                          className="mr-2" 
                          onClick={() => {
                            setSelectedModule(null);
                            setActiveTab("module");
                          }}
                        >
                          Back
                        </Button>
                        <Button onClick={addContent} disabled={!contentForm.name}>Add Content</Button>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
      
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Subject List</h2>
        
        {subjects.length === 0 ? (
          <p className="text-muted-foreground text-center p-8">No subjects added yet. Add your first subject above.</p>
        ) : (
          <div className="space-y-4">
            {subjects.map((subject: Subject) => (
              <Card key={subject._id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{subject.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{subject.modules.length} modules</Badge>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSubject(subject);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive/90" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSubject(subject);
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between mb-4 text-sm">
                    <div>
                      <p><strong>Total Duration:</strong> {formatDuration(subject.totalDuration)}</p>
                      <p><strong>PYQs:</strong> {subject.pyqs.count} questions ({formatDuration(subject.pyqs.estimatedDuration)})</p>
                    </div>
                    <div>
                      <p><strong>Modules:</strong> {subject.modules.length}</p>
                    </div>
                  </div>
                  
                  {subject.modules.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <h3 className="font-medium mb-2">Modules</h3>
                      <div className="space-y-3">
                        {subject.modules.map((module: Module) => (
                          <div key={module._id} className="border rounded-md p-3">
                            <div className="flex justify-between mb-2">
                              <h4 className="font-medium">{module.name}</h4>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {formatDuration(module.content.reduce((sum: number, item: ContentItem) => sum + item.durationMinutes, 0))}
                                </span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditModule(subject, module);
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-destructive hover:text-destructive/90" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteModule(subject, module);
                                  }}
                                >
                                  <Trash className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            {module.content.length > 0 && (
                              <div className="space-y-2 mt-2">
                                {module.content.map((item: ContentItem) => (
                                  <div key={item._id} className="flex justify-between items-center text-sm p-2 bg-muted/20 rounded-md">
                                    <div className="flex items-center gap-1">
                                      {getContentIcon(item.type)}
                                      <span>{item.name}</span>
                                      <Badge variant="outline" className="ml-1 text-xs">{item.type}</Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span>{formatDuration(item.durationMinutes)}</span>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditContent(subject, module, item);
                                        }}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 text-destructive hover:text-destructive/90" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteContent(subject, module, item);
                                        }}
                                      >
                                        <Trash className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Edit Subject Dialog */}
      <Dialog open={editSubjectDialog} onOpenChange={setEditSubjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
            <DialogDescription>
              Update the subject details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm mb-1">Subject Name</label>
              <Input 
                value={editSubjectForm.name} 
                onChange={(e) => setEditSubjectForm({...editSubjectForm, name: e.target.value})} 
                placeholder="e.g. Computer Networks"
              />
            </div>
            
            {/* Priority field removed, will be set by users */}
            
            <div>
              <label className="block text-sm mb-1">Previous Year Questions Count</label>
              <Input 
                type="number" 
                min="0" 
                value={editSubjectForm.pyqCount} 
                onChange={(e) => setEditSubjectForm({...editSubjectForm, pyqCount: parseInt(e.target.value) || 0})}
              />
              <p className="text-xs mt-1 text-muted-foreground">
                Estimated Time: {Math.ceil(editSubjectForm.pyqCount * 2.76923076923)} minutes
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdateSubject}>Update Subject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Subject Dialog */}
      <Dialog open={deleteSubjectDialog} onOpenChange={setDeleteSubjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subject</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this subject? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="font-medium">{currentSubject?.name}</p>
            <p className="text-sm text-muted-foreground">
              This will delete all modules and content within this subject.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDeleteSubject}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Module Dialog */}
      <Dialog open={editModuleDialog} onOpenChange={setEditModuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
            <DialogDescription>
              Update the module details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm mb-1">Module Name</label>
              <Input 
                value={editModuleForm.name} 
                onChange={(e) => setEditModuleForm({...editModuleForm, name: e.target.value})} 
                placeholder="e.g. Introduction to Networks"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdateModule}>Update Module</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Module Dialog */}
      <Dialog open={deleteModuleDialog} onOpenChange={setDeleteModuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Module</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this module? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="font-medium">{currentModule?.name}</p>
            <p className="text-sm text-muted-foreground">
              This will delete all content within this module.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDeleteModule}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Content Dialog */}
      <Dialog open={editContentDialog} onOpenChange={setEditContentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
            <DialogDescription>
              Update the content details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm mb-1">Content Type</label>
              <Select 
                value={editContentForm.type} 
                onValueChange={(value) => setEditContentForm({...editContentForm, type: value as 'lecture' | 'quiz' | 'homework'})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lecture">Lecture</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="homework">Homework</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm mb-1">Content Name</label>
              <Input 
                value={editContentForm.name} 
                onChange={(e) => setEditContentForm({...editContentForm, name: e.target.value})} 
                placeholder="e.g. Introduction to OSI Model"
              />
            </div>
            
            <div>
              <label className="block text-sm mb-1">Duration (HH:MM)</label>
              <Input 
                value={editContentForm.duration} 
                onChange={(e) => {
                  // Update duration string
                  const durationStr = e.target.value;
                  setEditContentForm({
                    ...editContentForm,
                    duration: durationStr
                  });
                  
                  // Calculate minutes from duration string
                  const totalMinutes = durationToMinutes(durationStr);
                  
                  // Update durationMinutes if we have a valid duration
                  if (totalMinutes > 0) {
                    setEditContentForm(prev => ({
                      ...prev,
                      durationMinutes: totalMinutes
                    }));
                  }
                }}
                placeholder="0:30"
              />
              <p className="text-xs mt-1 text-muted-foreground">
                {formatDuration(editContentForm.durationMinutes)} ({editContentForm.durationMinutes} minutes)
              </p>
            </div>
            
            {editContentForm.type === 'quiz' && (
              <div>
                <label className="block text-sm mb-1">Quiz Link</label>
                <Input 
                  value={editContentForm.link} 
                  onChange={(e) => setEditContentForm({...editContentForm, link: e.target.value})} 
                  placeholder="https://example.com/quiz"
                />
              </div>
            )}
            
            {editContentForm.type === 'homework' && (
              <div>
                <label className="block text-sm mb-1">Number of Questions</label>
                <Input 
                  type="number"
                  min="0"
                  value={editContentForm.questionCount} 
                  onChange={(e) => {
                    const questionCount = parseInt(e.target.value) || 0;
                    const calculatedDuration = Math.ceil(questionCount * 2.76923076923);
                    
                    // Update duration based on question count
                    const hours = Math.floor(calculatedDuration / 60);
                    const mins = calculatedDuration % 60;
                    
                    setEditContentForm({
                      ...editContentForm, 
                      questionCount: questionCount,
                      durationMinutes: calculatedDuration,
                      duration: `${hours}:${mins}`
                    });
                  }} 
                  placeholder="Number of questions..."
                />
                <p className="text-xs mt-1 text-muted-foreground">
                  Estimated Duration: {Math.ceil(editContentForm.questionCount * 2.76923076923)} minutes
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdateContent}>Update Content</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Content Dialog */}
      <Dialog open={deleteContentDialog} onOpenChange={setDeleteContentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Content</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this content? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="font-medium">{currentContent?.name}</p>
            <p className="text-sm text-muted-foreground">
              Type: {currentContent?.type}, Duration: {formatDuration(currentContent?.durationMinutes || 0)}
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDeleteContent}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}