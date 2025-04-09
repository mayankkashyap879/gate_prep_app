// backend/src/models/TestSeries.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ITestSeries extends Document {
  name: string;
  link: string;
  date: Date;
  topics: string[];
  relatedSubjects: mongoose.Types.ObjectId[];
}

const TestSeriesSchema = new Schema<ITestSeries>({
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
  topics: [{
    type: String,
    trim: true
  }],
  // Reference to subjects that this test covers
  relatedSubjects: [{
    type: Schema.Types.ObjectId,
    ref: 'Subject'
  }]
}, { timestamps: true });

const TestSeries = mongoose.model<ITestSeries>('TestSeries', TestSeriesSchema);
export default TestSeries;