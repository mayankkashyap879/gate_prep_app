// Updated mongoose.d.ts with proper type definitions
declare module 'mongoose' {
  interface Document {
    _id: any; // Make _id explicitly available
  }
}