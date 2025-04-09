// Data services for handling quiz and test data
import { quizzesAPI, testsAPI } from './api';

// Quiz interface
export interface Quiz {
  _id: string;
  id?: string; // Added for compatibility
  name: string;
  link: string;
  date: string;
  subject: string;
  topics: string[];
  remarks: string;
  isCompleted?: boolean;
  score?: number;
  maxScore?: number; // Added for completion
  timeSpent?: number;
  notes?: string; // Added for user feedback
}

// Test interface
export interface Test {
  _id: string;
  id?: string; // Added for compatibility
  name: string;
  link: string;
  date: string;
  topics: string[];
  isCompleted?: boolean;
  score?: number;
  maxScore?: number; // Added for completion
  timeSpent?: number; // Added for tracking time spent
  notes?: string; // Added for user feedback
  totalQuestions?: number;
  duration?: number; // in minutes
  difficulty?: number; // 1-5
  testType?: 'full-length' | 'topic-wise' | 'subject-wise' | 'practice';
}

// Format date from ISO to readable string
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

// Format topics from array to string
const formatTopics = (topics: string[]): string => {
  return topics.join(', ');
};

// Quiz service
export const quizService = {
  // Get all quizzes
  getAllQuizzes: async (): Promise<Quiz[]> => {
    try {
      const quizzes = await quizzesAPI.getAllQuizzes();
      return quizzes.map((quiz: any) => ({
        ...quiz,
        _id: quiz._id || quiz.id,
        date: formatDate(quiz.date),
        topics: Array.isArray(quiz.topics) ? formatTopics(quiz.topics) : quiz.topics
      }));
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      return [];
    }
  },

  // Get quiz by ID
  getQuizById: async (id: string): Promise<Quiz | undefined> => {
    try {
      const quiz = await quizzesAPI.getQuizById(id);
      if (!quiz) return undefined;
      
      return {
        ...quiz,
        _id: quiz._id || quiz.id,
        date: formatDate(quiz.date),
        topics: Array.isArray(quiz.topics) ? formatTopics(quiz.topics) : quiz.topics
      };
    } catch (error) {
      console.error(`Error fetching quiz ${id}:`, error);
      return undefined;
    }
  },

  // Get recommended quizzes based on user progress and interests
  getRecommendedQuizzes: async (): Promise<Quiz[]> => {
    try {
      const quizzes = await quizzesAPI.getRecommendedQuizzes();
      return quizzes
        .filter((quiz: any) => !quiz.isCompleted)
        .slice(0, 3)
        .map((quiz: any) => ({
          ...quiz,
          _id: quiz._id || quiz.id,
          date: formatDate(quiz.date),
          topics: Array.isArray(quiz.topics) ? formatTopics(quiz.topics) : quiz.topics
        }));
    } catch (error) {
      console.error('Error fetching recommended quizzes:', error);
      return [];
    }
  },

  // Get completed quizzes
  getCompletedQuizzes: async (): Promise<Quiz[]> => {
    try {
      const quizzes = await quizzesAPI.getCompletedQuizzes();
      return quizzes.map((quiz: any) => ({
        ...quiz,
        _id: quiz._id || quiz.id,
        date: formatDate(quiz.date),
        topics: Array.isArray(quiz.topics) ? formatTopics(quiz.topics) : quiz.topics
      }));
    } catch (error) {
      console.error('Error fetching completed quizzes:', error);
      return [];
    }
  },

  // Mark quiz as completed with score
  markQuizCompleted: async (id: string, score: number, maxScore: number, timeSpent: number, notes?: string): Promise<Quiz> => {
    try {
      const result = await quizzesAPI.markQuizCompleted(id, score, maxScore, timeSpent, notes);
      return {
        ...result,
        _id: result._id || result.id,
        date: formatDate(result.date),
        topics: Array.isArray(result.topics) ? formatTopics(result.topics) : result.topics,
        score,
        maxScore,
        timeSpent,
        isCompleted: true,
        notes
      };
    } catch (error) {
      console.error(`Error marking quiz ${id} as completed:`, error);
      throw error;
    }
  }
};

// Test service
export const testService = {
  // Get all unattempted tests
  getUnattemptedTests: async (): Promise<Test[]> => {
    try {
      const tests = await testsAPI.getAllUnattemptedTests();
      return tests.map((test: any) => ({
        ...test,
        _id: test._id || test.id,
        date: formatDate(test.date),
        topics: Array.isArray(test.topics) ? formatTopics(test.topics) : test.topics,
        testType: test.testType || 'full-length'
      }));
    } catch (error) {
      console.error('Error fetching unattempted tests:', error);
      return [];
    }
  },
  // Get all tests
  getAllTests: async (): Promise<Test[]> => {
    try {
      const tests = await testsAPI.getAllTests();
      return tests.map((test: any) => ({
        ...test,
        _id: test._id || test.id,
        date: formatDate(test.date),
        topics: Array.isArray(test.topics) ? formatTopics(test.topics) : test.topics,
        testType: test.testType || 'full-length'
      }));
    } catch (error) {
      console.error('Error fetching tests:', error);
      return [];
    }
  },

  // Get test by ID
  getTestById: async (id: string): Promise<Test | undefined> => {
    try {
      const test = await testsAPI.getTestById(id);
      if (!test) return undefined;
      
      return {
        ...test,
        _id: test._id || test.id,
        date: formatDate(test.date),
        topics: Array.isArray(test.topics) ? formatTopics(test.topics) : test.topics,
        testType: test.testType || 'full-length'
      };
    } catch (error) {
      console.error(`Error fetching test ${id}:`, error);
      return undefined;
    }
  },

  // Get upcoming tests (tests with future dates)
  getUpcomingTests: async (): Promise<Test[]> => {
    try {
      const tests = await testsAPI.getUpcomingTests();
      return tests.map((test: any) => ({
        ...test,
        _id: test._id || test.id,
        date: formatDate(test.date),
        topics: Array.isArray(test.topics) ? formatTopics(test.topics) : test.topics,
        testType: test.testType || 'full-length'
      }));
    } catch (error) {
      console.error('Error fetching upcoming tests:', error);
      return [];
    }
  },

  // Get completed tests
  getCompletedTests: async (): Promise<Test[]> => {
    try {
      const tests = await testsAPI.getCompletedTests();
      return tests.map((test: any) => ({
        ...test,
        _id: test._id || test.id,
        date: formatDate(test.date),
        topics: Array.isArray(test.topics) ? formatTopics(test.topics) : test.topics,
        testType: test.testType || 'full-length'
      }));
    } catch (error) {
      console.error('Error fetching completed tests:', error);
      return [];
    }
  },

  // Get practice tests
  getPracticeTests: async (): Promise<Test[]> => {
    try {
      const tests = await testsAPI.getPracticeTests();
      return tests.map((test: any) => ({
        ...test,
        _id: test._id || test.id,
        date: test.date ? formatDate(test.date) : '',
        topics: Array.isArray(test.topics) ? formatTopics(test.topics) : test.topics,
        testType: 'practice'
      }));
    } catch (error) {
      console.error('Error fetching practice tests:', error);
      return [];
    }
  },

  // Mark test as completed with score
  markTestCompleted: async (id: string, score: number, maxScore: number, timeSpent: number, notes?: string): Promise<Test> => {
    try {
      const result = await testsAPI.markTestCompleted(id, score, maxScore, timeSpent, notes);
      return {
        ...result,
        _id: result._id || result.id,
        date: formatDate(result.date),
        topics: Array.isArray(result.topics) ? formatTopics(result.topics) : result.topics,
        score,
        maxScore,
        timeSpent,
        notes,
        isCompleted: true
      };
    } catch (error) {
      console.error(`Error marking test ${id} as completed:`, error);
      throw error;
    }
  }
};