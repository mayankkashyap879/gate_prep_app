// backend/src/models/QuizProgress.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IQuizProgress extends Document {
  userId: mongoose.Types.ObjectId;
  quizId: mongoose.Types.ObjectId;
  score: number;
  maxScore: number;
  timeSpent: number; // in minutes
  completedDate: Date;
  notes?: string;
}

const QuizProgressSchema = new Schema<IQuizProgress>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quizId: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  maxScore: {
    type: Number,
    required: true
  },
  timeSpent: {
    type: Number,
    required: true
  },
  completedDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  }
}, { timestamps: true });

// Create a compound index to ensure a user doesn't have duplicate quiz attempts
// If you want to allow multiple attempts, remove this index
QuizProgressSchema.index({ userId: 1, quizId: 1 }, { unique: true });

const QuizProgress = mongoose.model<IQuizProgress>('QuizProgress', QuizProgressSchema);
export default QuizProgress;