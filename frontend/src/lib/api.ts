// API service for handling backend requests
import axios from 'axios';
import Cookies from 'js-cookie';

// Define default API URL based on environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  // Adding timeout to avoid hanging requests
  timeout: 10000
});

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    console.log('API Request Interceptor - Token exists:', !!token);
    
    if (token) {
      // Make sure headers object exists
      if (!config.headers) {
        config.headers = {};
      }
      
      // Add token to Authorization header as Bearer token
      config.headers['x-auth-token'] = token;
      
      // Also add as Authorization header for APIs that might expect it that way
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('API Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;
    
    // Handle unauthorized errors (401)
    if (response && response.status === 401) {
      removeToken();
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Auth functions
export const setToken = (token: string) => {
  Cookies.set('auth_token', token, { expires: 7 }); // 7 days expiry
};

export const getToken = () => {
  return Cookies.get('auth_token');
};

export const removeToken = () => {
  Cookies.remove('auth_token');
};

export const isAuthenticated = () => {
  return !!getToken();
};

// Auth API endpoints
export const authAPI = {
  register: async (userData: { name: string; email: string; password: string; deadline: string }) => {
    try {
      console.log('Sending register request to:', `${API_URL}/auth/register`);
      console.log('With data:', userData);
      
      // Try with axios first
      try {
        const response = await api.post('/auth/register', userData);
        console.log('Axios register response:', response);
        
        // Store token in cookie if it exists in the response
        if (response.data && response.data.token) {
          setToken(response.data.token);
          console.log('Token stored in cookie after registration');
        } else {
          console.warn('No token received in register response');
        }
        
        return response.data;
      } catch (axiosError) {
        console.error('Axios registration failed, trying fetch:', axiosError);
        
        // Fallback to fetch API
        const fetchResponse = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(userData)
        });
        
        if (!fetchResponse.ok) {
          throw new Error(`Fetch API error: ${fetchResponse.status} ${fetchResponse.statusText}`);
        }
        
        const data = await fetchResponse.json();
        console.log('Fetch register response:', data);
        
        // Store token in cookie if it exists in the response
        if (data && data.token) {
          setToken(data.token);
          console.log('Token stored in cookie after fetch registration');
        } else {
          console.warn('No token received in fetch register response');
        }
        
        return data;
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  login: async (credentials: { email: string; password: string }) => {
    try {
      console.log('Sending login request to:', `${API_URL}/auth/login`);
      console.log('With credentials:', { email: credentials.email, password: '********' });
      
      // Try with axios first
      try {
        const response = await api.post('/auth/login', credentials);
        console.log('Axios login response:', response);
        
        // Store token in cookie if it exists in the response
        if (response.data && response.data.token) {
          setToken(response.data.token);
          console.log('Token stored in cookie after login');
        } else {
          console.warn('No token received in login response');
        }
        
        return response.data;
      } catch (axiosError) {
        console.error('Axios login failed, trying fetch:', axiosError);
        
        // Fallback to fetch API
        const fetchResponse = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(credentials)
        });
        
        if (!fetchResponse.ok) {
          throw new Error(`Fetch API error: ${fetchResponse.status} ${fetchResponse.statusText}`);
        }
        
        const data = await fetchResponse.json();
        console.log('Fetch login response:', data);
        
        // Store token in cookie if it exists in the response
        if (data && data.token) {
          setToken(data.token);
          console.log('Token stored in cookie after fetch login');
        } else {
          console.warn('No token received in fetch login response');
        }
        
        return data;
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  getCurrentUser: async () => {
    try {
      console.log('Getting current user, token exists:', !!getToken());
      
      // Try with axios first
      try {
        const response = await api.get('/auth/user');
        console.log('Axios getCurrentUser response:', response);
        return response.data;
      } catch (axiosError) {
        console.error('Axios getCurrentUser failed, trying fetch:', axiosError);
        
        // Fallback to fetch API
        const token = getToken();
        const fetchResponse = await fetch(`${API_URL}/auth/user`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token || ''
          },
          credentials: 'include'
        });
        
        if (!fetchResponse.ok) {
          throw new Error(`Fetch API error: ${fetchResponse.status} ${fetchResponse.statusText}`);
        }
        
        const data = await fetchResponse.json();
        console.log('Fetch getCurrentUser response:', data);
        return data;
      }
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  },
  
  updateDeadline: async (deadline: string) => {
    try {
      const response = await api.put('/auth/update-deadline', { deadline });
      return response.data;
    } catch (error) {
      console.error('Update deadline error:', error);
      throw error;
    }
  },
  
  updatePlan: async (data: { selectedPlan: string; customTarget?: number }) => {
    try {
      const response = await api.put('/auth/update-plan', data);
      return response.data;
    } catch (error) {
      console.error('Update plan error:', error);
      throw error;
    }
  },
  
  selectSubjects: async (subjects: string[], priorities?: {[key: string]: number}) => {
    try {
      const response = await api.put('/auth/select-subjects', { 
        subjects,
        priorities
      });
      return response.data;
    } catch (error) {
      console.error('Select subjects error:', error);
      throw error;
    }
  }
};

// Quizzes API
export const quizzesAPI = {
  getAllQuizzes: async () => {
    try {
      const response = await api.get('/quizzes');
      return response.data;
    } catch (error) {
      console.error('Get quizzes error:', error);
      throw error;
    }
  },
  
  getQuizById: async (id: string) => {
    try {
      const response = await api.get(`/quizzes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get quiz error:', error);
      throw error;
    }
  },
  
  getRecommendedQuizzes: async () => {
    try {
      // For now, we'll fetch all quizzes and do basic recommendation
      // In the future, this could be a dedicated endpoint with user-specific recommendations
      const response = await api.get('/quizzes');
      return response.data;
    } catch (error) {
      console.error('Get recommended quizzes error:', error);
      throw error;
    }
  },
  
  getCompletedQuizzes: async () => {
    try {
      // This will need to be updated when we have proper completed quizzes tracking
      const response = await api.get('/quizzes');
      return response.data.filter((quiz: any) => quiz.isCompleted);
    } catch (error) {
      console.error('Get completed quizzes error:', error);
      throw error;
    }
  },
  
  markQuizCompleted: async (id: string, score: number, maxScore: number, timeSpent: number, notes?: string) => {
    try {
      const response = await api.post(`/quizzes/${id}/complete`, {
        score,
        maxScore,
        timeSpent,
        notes
      });
      return response.data;
    } catch (error) {
      console.error('Mark quiz completed error:', error);
      throw error;
    }
  }
};

// Tests API
export const testsAPI = {
  getAllTests: async () => {
    try {
      const response = await api.get('/tests');
      return response.data;
    } catch (error) {
      console.error('Get tests error:', error);
      throw error;
    }
  },
  
  getTestById: async (id: string) => {
    try {
      const response = await api.get(`/tests/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get test error:', error);
      throw error;
    }
  },
  
  getUpcomingTests: async () => {
    try {
      // We can use the dedicated upcoming endpoint
      const response = await api.get('/tests/upcoming');
      return response.data;
    } catch (error) {
      console.error('Get upcoming tests error:', error);
      throw error;
    }
  },
  
  getCompletedTests: async () => {
    try {
      const response = await api.get('/tests/completed');
      return response.data;
    } catch (error) {
      console.error('Get completed tests error:', error);
      throw error;
    }
  },
  
  getPracticeTests: async () => {
    try {
      const response = await api.get('/tests/practice');
      return response.data;
    } catch (error) {
      console.error('Get practice tests error:', error);
      throw error;
    }
  },
  
  markTestCompleted: async (id: string, score: number, maxScore: number, timeSpent: number, notes?: string) => {
    try {
      const response = await api.post(`/tests/${id}/complete`, {
        score,
        maxScore,
        timeSpent,
        notes
      });
      return response.data;
    } catch (error) {
      console.error('Mark test completed error:', error);
      throw error;
    }
  },
  
  getAllUnattemptedTests: async () => {
    try {
      const response = await api.get('/tests/unattempted');
      return response.data;
    } catch (error) {
      console.error('Get unattempted tests error:', error);
      throw error;
    }
  }
};

// Subjects API
export const subjectsAPI = {
  getAllSubjects: async () => {
    try {
      const response = await api.get('/subjects');
      return response.data;
    } catch (error) {
      console.error('Get subjects error:', error);
      throw error;
    }
  },
  
  getSubjectById: async (id: string) => {
    try {
      const response = await api.get(`/subjects/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get subject error:', error);
      throw error;
    }
  }
};

// Progress API
export const progressAPI = {
  getUserProgress: async () => {
    try {
      // Get the progress summary for overall stats and completion
      const response = await api.get('/progress/summary');
      return response.data;
    } catch (error) {
      console.error('Get progress error:', error);
      throw error;
    }
  },
  
  // Get detailed progress items
  getProgressItems: async () => {
    try {
      const response = await api.get('/progress');
      return response.data;
    } catch (error) {
      console.error('Get progress items error:', error);
      throw error;
    }
  },
  
  updateProgress: async (data: { subjectId: string; topicId: string; status: string }) => {
    try {
      const response = await api.post('/progress/update', data);
      return response.data;
    } catch (error) {
      console.error('Update progress error:', error);
      throw error;
    }
  }
};

// Schedule API
export const scheduleAPI = {
  getUserSchedule: async () => {
    try {
      const response = await api.get('/schedule');
      return response.data;
    } catch (error) {
      console.error('Get schedule error:', error);
      throw error;
    }
  },
  
  getScheduleForDate: async (date: string) => {
    try {
      // If it's today's date, use the /today endpoint
      const today = new Date();
      const formattedToday = today.toISOString().split('T')[0];
      
      if (date === formattedToday) {
        const response = await api.get('/schedule/today');
        return response.data;
      } else {
        // Otherwise use the date-specific endpoint
        const response = await api.get(`/schedule/date/${date}`);
        return response.data;
      }
    } catch (error) {
      console.error('Get schedule for date error:', error);
      
      // If we get a 404, return an empty schedule instead of throwing
      if (error.response && error.response.status === 404) {
        return {
          date: date,
          plannedSessions: [],
          totalPlannedDuration: 0,
          totalCompletedDuration: 0
        };
      }
      
      throw error;
    }
  },
  
  generateSchedule: async (startDate?: string, days: number = 30, regenerate: boolean = false) => {
    try {
      console.log('Generating schedule starting from:', startDate || 'today', 'for', days, 'days');
      const data: any = {
        regenerate // Include the regenerate flag
      };
      if (startDate) data.startDate = startDate;
      if (days) data.days = days;
      
      const response = await api.post('/schedule/generate', data);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to generate schedule';
      const errorDetails = error.response?.data?.details || error.message;
      
      console.error('Generate schedule error:', errorMessage, errorDetails);
      
      // Categorize common errors for better user feedback
      let userFriendlyMessage = 'Could not generate your schedule.';
      
      if (errorMessage.includes('No subjects selected') || errorDetails.includes('No subjects selected')) {
        userFriendlyMessage = 'Please select at least one subject in your settings before generating a schedule.';
      } else if (errorMessage.includes('Deadline not set') || errorDetails.includes('deadline not set')) {
        userFriendlyMessage = 'Please set your exam deadline in settings before generating a schedule.';
      } else if (errorMessage.includes('Schedule too large') || errorDetails.includes('document size limit')) {
        userFriendlyMessage = 'Your schedule is too large. Try selecting fewer subjects or a shorter schedule period.';
      } else if (errorMessage.includes('User not found')) {
        userFriendlyMessage = 'Your user account information could not be found. Try logging out and back in.';
      }
      
      // Re-throw with better error message
      const enhancedError = new Error(userFriendlyMessage);
      // Add additional context to the error object for debugging
      // @ts-ignore - Adding properties to Error object
      enhancedError.originalError = error;
      // @ts-ignore
      enhancedError.technicalDetails = `${errorMessage}: ${errorDetails}`;
      // @ts-ignore
      enhancedError.userFriendlyMessage = userFriendlyMessage;
      
      throw enhancedError;
    }
  },
  
  resetSchedule: async () => {
    try {
      console.log('Resetting user schedule');
      const response = await api.delete('/schedule/reset');
      return response.data;
    } catch (error) {
      console.error('Reset schedule error:', error);
      throw error;
    }
  }
};

// Study Session API
export const studySessionAPI = {
  createSession: async (data: { 
    subjectId: string; 
    moduleId: string; 
    itemId: string;
    type: string;
    duration: number;
    startTime?: string;
    endTime?: string;
    notes?: string;
  }) => {
    try {
      // Add default start and end times if not provided
      const now = new Date();
      const durationInMs = data.duration * 60 * 1000; // Convert minutes to milliseconds
      
      const sessionData = {
        ...data,
        startTime: data.startTime || now.toISOString(),
        endTime: data.endTime || new Date(now.getTime() + durationInMs).toISOString()
      };
      
      const response = await api.post('/study-session', sessionData);
      return response.data;
    } catch (error) {
      console.error('Create session error:', error);
      throw error;
    }
  },
  
  // Handle completing study sessions
  completeSession: async (id: string, data: { duration: number; notes?: string; type?: string }) => {
    try {
      console.log('Completing session with ID:', id, 'and data:', data);
      
      // Extract IDs from the compound ID if possible
      // ID format could be either:
      // 1. subjectId-moduleId-itemId (for schedule items)
      // 2. scheduleItemId (for direct schedule items)
      // 3. studySessionId (for existing sessions)
      let subjectId = '';
      let moduleId = '';
      let itemId = '';
      const itemType = data.type || 'lecture'; // Use provided type or default to lecture
      let scheduleItemId = '';
      
      // More detailed logging
      console.log('Session completion data:', {
        id,
        data,
        type: itemType
      });
      
      if (id.includes('-')) {
        const parts = id.split('-');
        if (parts.length >= 3) {
          // Format: subjectId-moduleId-itemId
          subjectId = parts[0];
          moduleId = parts[1];
          itemId = parts[2];
          console.log('Parsed compound ID as subject-module-item:', { subjectId, moduleId, itemId });
        } else if (parts.length === 2) {
          // Format: scheduleId-sessionId
          scheduleItemId = parts[0];
          console.log('Parsed compound ID as scheduleId-sessionId:', { scheduleItemId });
        }
      } else {
        // Single ID - could be a schedule item or study session
        scheduleItemId = id;
        console.log('Using ID as scheduleItemId:', scheduleItemId);
      }
      
      // Get current time to calculate start time
      const now = new Date();
      const startTime = new Date(now.getTime() - (data.duration * 60 * 1000));
      
      // Try different approaches based on available IDs
      if (subjectId && moduleId && itemId && 
          subjectId.match(/^[0-9a-fA-F]{24}$/) && 
          moduleId.match(/^[0-9a-fA-F]{24}$/)) {
        // We have valid MongoDB IDs for subject, module, and item
        // Create a new study session
        console.log('Creating new study session with subject, module, item IDs');
        
        const sessionData = {
          subjectId,
          moduleId,
          itemId,
          type: itemType,
          duration: data.duration,
          startTime: startTime.toISOString(),
          endTime: now.toISOString(),
          notes: data.notes || 'Completed via timer'
        };
        
        console.log('Sending study session data to API:', sessionData);
        const response = await api.post('/study-session', sessionData);
        return response.data;
      } 
      else if (scheduleItemId && scheduleItemId.match(/^[0-9a-fA-F]{24}$/)) {
        // We have a valid MongoDB ID for a schedule item
        // Mark the schedule item as completed
        console.log('Marking schedule item as completed');
        try {
          // Include type in the schedule session completion payload
          const response = await api.put(`/schedule/session/${scheduleItemId}`, {
            completed: true,
            duration: data.duration,
            notes: data.notes || 'Completed via timer',
            type: itemType
          });
          return response.data;
        } catch (scheduleError) {
          console.error('Error marking schedule item as completed:', scheduleError);
          
          // If that fails, try to record it as a study session directly
          console.log('Falling back to creating general study session');
          const sessionData = {
            // Use placeholder IDs when actual IDs are not available
            subjectId: "000000000000000000000000",
            moduleId: "000000000000000000000000",
            itemId: scheduleItemId,
            type: itemType || 'manual', // Use provided type if available
            duration: data.duration,
            startTime: startTime.toISOString(),
            endTime: now.toISOString(),
            notes: data.notes || 'Session completed manually'
          };
          
          console.log('Sending fallback study session data to API:', sessionData);
          const response = await api.post('/study-session', sessionData);
          return response.data;
        }
      } 
      else {
        // We don't have valid IDs in the expected format
        // Create a generic study session
        console.warn('Could not parse ID into valid MongoDB IDs, creating a generic study session');
        
        const sessionData = {
          subjectId: "000000000000000000000000",
          moduleId: "000000000000000000000000",
          itemId: id || "000000000000000000000000",
          type: itemType || 'manual', // Use provided type if available
          duration: data.duration,
          startTime: startTime.toISOString(),
          endTime: now.toISOString(),
          notes: data.notes || 'Generic study session'
        };
        
        console.log('Sending generic study session data to API:', sessionData);
        const response = await api.post('/study-session', sessionData);
        return response.data;
      }
    } catch (error) {
      console.error('Complete session error:', error);
      throw error;
    }
  },
  
  getUserSessions: async (params?: { startDate?: string; endDate?: string }) => {
    try {
      const response = await api.get('/study-session', { params });
      return response.data;
    } catch (error) {
      console.error('Get user sessions error:', error);
      throw error;
    }
  }
};

// Leaderboard API
export const leaderboardAPI = {
  getLeaderboard: async (
    timeFrame: 'daily' | 'weekly' | 'monthly' | 'overall' = 'overall', 
    limit: number = 10
  ) => {
    try {
      console.log(`Fetching leaderboard for timeframe: ${timeFrame} with limit: ${limit}`);
      
      // Make sure the timeFrame parameter is one of the allowed values
      const validTimeFrame = ['daily', 'weekly', 'monthly', 'overall'].includes(timeFrame) 
        ? timeFrame 
        : 'overall';
        
      const response = await api.get(`/leaderboard?timeFrame=${validTimeFrame}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Get leaderboard error:', error);
      throw error;
    }
  }
};

// Admin API
export const adminAPI = {
  // Dashboard
  getDashboard: async () => {
    try {
      const response = await api.get('/admin/dashboard');
      return response.data;
    } catch (error) {
      console.error('Get admin dashboard error:', error);
      throw error;
    }
  },
  
  // Subjects
  getSubjects: async () => {
    try {
      const response = await api.get('/admin/subjects');
      return response.data;
    } catch (error) {
      console.error('Get admin subjects error:', error);
      throw error;
    }
  },
  
  createSubject: async (data: any) => {
    try {
      const response = await api.post('/admin/subjects', data);
      return response.data;
    } catch (error) {
      console.error('Create subject error:', error);
      throw error;
    }
  },
  
  updateSubject: async (id: string, data: any) => {
    try {
      const response = await api.put(`/admin/subjects/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Update subject error:', error);
      throw error;
    }
  },
  
  deleteSubject: async (id: string) => {
    try {
      const response = await api.delete(`/admin/subjects/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete subject error:', error);
      throw error;
    }
  },
  
  // Module Management
  addModuleToSubject: async (subjectId: string, data: { name: string }) => {
    try {
      const response = await api.post(`/admin/subjects/${subjectId}/modules`, data);
      return response.data;
    } catch (error) {
      console.error('Add module error:', error);
      throw error;
    }
  },
  
  updateModule: async (subjectId: string, moduleId: string, data: { name: string }) => {
    try {
      const response = await api.put(`/admin/subjects/${subjectId}/modules/${moduleId}`, data);
      return response.data;
    } catch (error) {
      console.error('Update module error:', error);
      throw error;
    }
  },
  
  deleteModule: async (subjectId: string, moduleId: string) => {
    try {
      const response = await api.delete(`/admin/subjects/${subjectId}/modules/${moduleId}`);
      return response.data;
    } catch (error) {
      console.error('Delete module error:', error);
      throw error;
    }
  },
  
  // Content Management
  addContentToModule: async (
    subjectId: string, 
    moduleId: string, 
    data: { 
      type: 'lecture' | 'quiz' | 'homework',
      name: string,
      durationMinutes: number,
      duration?: string,
      link?: string,
      description?: string,
      questionCount?: number
    }
  ) => {
    try {
      const response = await api.post(`/admin/subjects/${subjectId}/modules/${moduleId}/content`, data);
      return response.data;
    } catch (error) {
      console.error('Add content error:', error);
      throw error;
    }
  },
  
  updateContent: async (
    subjectId: string, 
    moduleId: string, 
    contentId: string,
    data: { 
      type: 'lecture' | 'quiz' | 'homework',
      name: string,
      durationMinutes: number,
      duration?: string,
      link?: string,
      description?: string,
      questionCount?: number
    }
  ) => {
    try {
      const response = await api.put(`/admin/subjects/${subjectId}/modules/${moduleId}/content/${contentId}`, data);
      return response.data;
    } catch (error) {
      console.error('Update content error:', error);
      throw error;
    }
  },
  
  deleteContent: async (subjectId: string, moduleId: string, contentId: string) => {
    try {
      const response = await api.delete(`/admin/subjects/${subjectId}/modules/${moduleId}/content/${contentId}`);
      return response.data;
    } catch (error) {
      console.error('Delete content error:', error);
      throw error;
    }
  },
  
  // Quizzes
  getQuizzes: async () => {
    try {
      const response = await api.get('/admin/quizzes');
      return response.data;
    } catch (error) {
      console.error('Get admin quizzes error:', error);
      throw error;
    }
  },
  
  createQuiz: async (data: any) => {
    try {
      const response = await api.post('/admin/quizzes', data);
      return response.data;
    } catch (error) {
      console.error('Create quiz error:', error);
      throw error;
    }
  },
  
  updateQuiz: async (id: string, data: any) => {
    try {
      const response = await api.put(`/admin/quizzes/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Update quiz error:', error);
      throw error;
    }
  },
  
  deleteQuiz: async (id: string) => {
    try {
      const response = await api.delete(`/admin/quizzes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete quiz error:', error);
      throw error;
    }
  },
  
  uploadQuizzes: async (formData: FormData) => {
    try {
      const response = await api.post('/admin/quizzes/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Upload quizzes error:', error);
      throw error;
    }
  },
  
  // Tests
  getTests: async () => {
    try {
      const response = await api.get('/admin/tests');
      return response.data;
    } catch (error) {
      console.error('Get admin tests error:', error);
      throw error;
    }
  },
  
  createTest: async (data: any) => {
    try {
      const response = await api.post('/admin/tests', data);
      return response.data;
    } catch (error) {
      console.error('Create test error:', error);
      throw error;
    }
  },
  
  updateTest: async (id: string, data: any) => {
    try {
      const response = await api.put(`/admin/tests/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Update test error:', error);
      throw error;
    }
  },
  
  deleteTest: async (id: string) => {
    try {
      const response = await api.delete(`/admin/tests/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete test error:', error);
      throw error;
    }
  },
  
  uploadTests: async (formData: FormData) => {
    try {
      const response = await api.post('/admin/tests/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Upload tests error:', error);
      throw error;
    }
  }
};

export default api;