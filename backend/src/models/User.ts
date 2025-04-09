// backend/src/models/User.ts
import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// Define progress interfaces
export interface IQuizProgress {
  quizId: mongoose.Types.ObjectId;
  completed: boolean;
  score?: number;
  maxScore?: number;
  completedDate?: Date;
  timeSpent?: number;
  notes?: string;
}

export interface ITestProgress {
  testId: mongoose.Types.ObjectId;
  completed: boolean;
  score?: number;
  maxScore?: number;
  completedDate?: Date;
  timeSpent?: number;
  notes?: string;
}

export interface IContentProgress {
  subjectId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  type: 'lecture' | 'quiz' | 'homework' | 'pyq' | 'test';
  completed: boolean;
  completedDate?: Date;
  timeSpent?: number;
  notes?: string;
}

export interface IScheduleItem {
  _id?: mongoose.Types.ObjectId; // MongoDB will add this
  date: Date;
  subjectId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  type: 'lecture' | 'quiz' | 'homework' | 'pyq' | 'test';
  name: string;
  moduleName?: string;
  subjectName?: string;
  duration: number;
  completed: boolean;
  completedDate?: Date;
}

// Define Study Session interface
export interface IStudySession {
  subjectId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  type: 'lecture' | 'quiz' | 'homework' | 'pyq' | 'test';
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // Optional now as Google Auth users won't have passwords
  googleId?: string; // Added for Google Authentication
  picture?: string; // Profile picture URL from Google
  role: 'user' | 'admin';
  deadline: Date;
  dailyTarget: {
    minimum: number;
    moderate: number;
    maximum: number;
    custom: number;
  };
  selectedPlan: 'minimum' | 'moderate' | 'maximum' | 'custom';
  selectedSubjects: mongoose.Types.ObjectId[];
  subjectPriorities: Record<string, number>; // Store priorities for subjects
  streak: number;
  lastStreakDate: Date | null;
  totalStudyTime: number;
  
  // Progress tracking
  quizProgress: IQuizProgress[];
  testProgress: ITestProgress[];
  contentProgress: IContentProgress[];
  
  // Study sessions
  studySessions: IStudySession[];
  
  // Schedule
  schedule: IScheduleItem[];
  
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  isAdmin(): boolean;
  
  // Additional properties with unique id
  id: string; // For Request object use
}

// Create schemas for nested types
const quizProgressSchema = new Schema({
  quizId: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  score: Number,
  maxScore: Number,
  completedDate: Date,
  timeSpent: Number,
  notes: String
});

const testProgressSchema = new Schema({
  testId: {
    type: Schema.Types.ObjectId,
    ref: 'Test',
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  score: Number,
  maxScore: Number,
  completedDate: Date,
  timeSpent: Number,
  notes: String
});

const contentProgressSchema = new Schema({
  subjectId: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  moduleId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  itemId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  type: {
    type: String,
    enum: ['lecture', 'quiz', 'homework', 'pyq', 'test'],
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedDate: Date,
  timeSpent: Number,
  notes: String
});

const studySessionSchema = new Schema({
  subjectId: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  moduleId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  itemId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  type: {
    type: String,
    enum: ['lecture', 'quiz', 'homework', 'pyq', 'test'],
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // minutes
    required: true
  },
  notes: String
}, { timestamps: true });

const scheduleItemSchema = new Schema({
  date: {
    type: Date,
    required: true
  },
  subjectId: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  moduleId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  itemId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  type: {
    type: String,
    enum: ['lecture', 'quiz', 'homework', 'pyq', 'test'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  moduleName: String,
  subjectName: String,
  duration: {
    type: Number,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedDate: Date
});

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: false // No longer required for Google Auth users
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows null values to not violate unique constraint
  },
  picture: {
    type: String
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  deadline: {
    type: Date,
    required: true,
    default: () => {
      const date = new Date();
      date.setMonth(date.getMonth() + 6); // Default to 6 months from now
      return date;
    }
  },
  dailyTarget: {
    minimum: {
      type: Number, // minutes
      default: 0
    },
    moderate: {
      type: Number, // minutes
      default: 0
    },
    maximum: {
      type: Number, // minutes
      default: 0
    },
    custom: {
      type: Number, // minutes
      default: 0
    }
  },
  selectedPlan: {
    type: String,
    enum: ['minimum', 'moderate', 'maximum', 'custom'],
    default: 'moderate'
  },
  selectedSubjects: [{
    type: Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  subjectPriorities: {
    type: Map,
    of: Number,
    default: {}
  },
  streak: {
    type: Number,
    default: 0
  },
  lastStreakDate: {
    type: Date,
    default: null
  },
  totalStudyTime: {
    type: Number, // minutes
    default: 0
  },
  
  // New progress tracking fields
  quizProgress: [quizProgressSchema],
  testProgress: [testProgressSchema],
  contentProgress: [contentProgressSchema],
  
  // Study sessions
  studySessions: [studySessionSchema],
  
  // User's schedule
  schedule: [scheduleItemSchema],
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Pre-save middleware to hash password (only if password is set)
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error as Error);
  }
});

// Method to compare password (only for users with passwords)
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user is admin
UserSchema.methods.isAdmin = function(): boolean {
  return this.role === 'admin';
};

const User = mongoose.model<IUser>('User', UserSchema);
export default User;