// backend/src/models/Schedule.ts
import mongoose, { Document, Schema } from 'mongoose';

// Define the basic structure of a planned session without document methods
export interface IPlannedSessionBase {
  subjectId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  type: 'lecture' | 'quiz' | 'homework' | 'pyq' | 'test';
  duration: number;
  completed: boolean;
  name: string;
  moduleName: string;
  subjectName: string;
}

// Add the _id field that will be present in documents
export interface IPlannedSession extends IPlannedSessionBase {
  _id?: mongoose.Types.ObjectId;
}

// Define the basic structure of a schedule without document methods
export interface IScheduleBase {
  userId: mongoose.Types.ObjectId;
  date: Date;
  plannedSessions: IPlannedSession[];
  totalPlannedDuration: number;
  totalCompletedDuration: number;
}

// Combine with Document to create the mongoose document interface
export interface ISchedule extends IScheduleBase, Document {}

const plannedSessionSchema = new Schema<IPlannedSession>({
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
  duration: {
    type: Number, // minutes
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    required: true
  },
  moduleName: {
    type: String,
    required: true
  },
  subjectName: {
    type: String,
    required: true
  }
});

const ScheduleSchema = new Schema<ISchedule>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  plannedSessions: [plannedSessionSchema],
  totalPlannedDuration: {
    type: Number, // minutes
    default: 0
  },
  totalCompletedDuration: {
    type: Number, // minutes
    default: 0
  }
}, { timestamps: true });

// Create a compound index for userId and date
ScheduleSchema.index({ userId: 1, date: 1 }, { unique: true });

// Calculate totals before saving
ScheduleSchema.pre('save', function(next) {
  let totalPlanned = 0;
  let totalCompleted = 0;
  
  this.plannedSessions.forEach(session => {
    totalPlanned += session.duration;
    
    if (session.completed) {
      totalCompleted += session.duration;
    }
  });
  
  this.totalPlannedDuration = totalPlanned;
  this.totalCompletedDuration = totalCompleted;
  next();
});

const Schedule = mongoose.model<ISchedule>('Schedule', ScheduleSchema);
export default Schedule;