// backend/src/models/UserProgress.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IUserProgress extends Document {
  userId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  type: 'lecture' | 'quiz' | 'homework' | 'pyq';
  completed: boolean;
  completedWithTimer: boolean;
  duration: number;
  date: Date;
}

const UserProgressSchema = new Schema<IUserProgress>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
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
    enum: ['lecture', 'quiz', 'homework', 'pyq'],
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedWithTimer: {
    type: Boolean,
    default: false
  },
  duration: {
    type: Number, // minutes
    default: 0
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create a compound index to ensure uniqueness
UserProgressSchema.index({ 
  userId: 1, 
  subjectId: 1, 
  moduleId: 1, 
  itemId: 1, 
  type: 1 
}, { unique: true });

const UserProgress = mongoose.model<IUserProgress>('UserProgress', UserProgressSchema);
export default UserProgress;