// backend/src/models/Quiz.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IQuizModel extends Document {
  name: string;
  link: string;
  date: Date;
  subject: string;
  topics: string[];
  remarks: string;
  relatedSubjects: mongoose.Types.ObjectId[];
}

const QuizSchema = new Schema<IQuizModel>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  link: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  topics: [{
    type: String,
    trim: true
  }],
  remarks: {
    type: String,
    trim: true
  },
  // Reference to subjects that this quiz covers
  relatedSubjects: [{
    type: Schema.Types.ObjectId,
    ref: 'Subject'
  }]
}, { timestamps: true });

const Quiz = mongoose.model<IQuizModel>('Quiz', QuizSchema);
export default Quiz;