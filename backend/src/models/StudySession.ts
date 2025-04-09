// backend/src/models/StudySession.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IStudySession extends Document {
  userId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date;
  duration: number;
  subjectId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  type: 'lecture' | 'quiz' | 'homework' | 'pyq';
  notes: string;
}

const StudySessionSchema = new Schema<IStudySession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
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
  notes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

const StudySession = mongoose.model<IStudySession>('StudySession', StudySessionSchema);
export default StudySession;