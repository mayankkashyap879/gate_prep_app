// backend/src/models/Subject.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

// Define content item interfaces
export interface IContentItemBase {
  _id: mongoose.Types.ObjectId;
  type: string;
  name: string;
  durationMinutes: number;
}

export interface ILecture extends IContentItemBase {
  type: 'lecture';
  duration: string; // HH:MM:SS format
}

export interface IQuiz extends IContentItemBase {
  type: 'quiz';
  link: string;
}

export interface IHomework extends IContentItemBase {
  type: 'homework';
  questionCount: number; // Number of questions
}

export type ContentItem = ILecture | IQuiz | IHomework;

// Module interface
export interface IModule {
  _id?: mongoose.Types.ObjectId;
  name: string;
  content: ContentItem[];
}

// Subject interface
export interface ISubject extends Document {
  name: string;
  totalDuration: number;
  priority: number;
  modules: IModule[];
  pyqs: {
    count: number;
    estimatedDuration: number;
  };
}

// Content item schema
const contentItemSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['lecture', 'quiz', 'homework']
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  durationMinutes: {
    type: Number,
    required: true
  }
}, { discriminatorKey: 'type', _id: true });

// Lecture schema
const lectureSchema = new Schema({
  duration: {
    type: String, // HH:MM:SS format
    required: true
  }
});

// Quiz schema
const quizSchema = new Schema({
  link: {
    type: String,
    trim: true
  }
});

// Homework schema
const homeworkSchema = new Schema({
  questionCount: {
    type: Number,
    required: true,
    default: 0
  }
});

// Module schema with content items
const moduleSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  content: [contentItemSchema]
});

// We'll handle the discriminators differently - in the content schema directly
const ContentSchema = mongoose.model('ContentItem', contentItemSchema);
ContentSchema.discriminator('lecture', lectureSchema);
ContentSchema.discriminator('quiz', quizSchema);
ContentSchema.discriminator('homework', homeworkSchema);

// PYQ schema
const pyqSchema = new Schema({
  count: {
    type: Number,
    default: 0
  },
  estimatedDuration: {
    type: Number,
    default: 0 // minutes
  }
});

// Subject schema
const SubjectSchema = new Schema<ISubject>({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  totalDuration: {
    type: Number, // minutes
    default: 0
  },
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  modules: [moduleSchema],
  pyqs: pyqSchema
}, { timestamps: true });

// Calculate total duration before saving
SubjectSchema.pre('save', function(next) {
  let totalMinutes = 0;
  
  // Sum all content durations from all modules
  this.modules.forEach(module => {
    module.content.forEach(item => {
      totalMinutes += item.durationMinutes;
    });
  });
  
  // Add PYQ duration
  if (this.pyqs && this.pyqs.count) {
    this.pyqs.estimatedDuration = Math.ceil(this.pyqs.count * 2.76923076923);
    totalMinutes += this.pyqs.estimatedDuration;
  }
  
  this.totalDuration = totalMinutes;
  next();
});

const Subject = mongoose.model<ISubject>('Subject', SubjectSchema);
export default Subject;