// backend/src/utils/mongoose-utils.ts
import mongoose from 'mongoose';

export const toObjectId = (id: string | mongoose.Types.ObjectId | unknown): mongoose.Types.ObjectId => {
  if (id instanceof mongoose.Types.ObjectId) {
    return id;
  }
  
  if (typeof id === 'string') {
    return new mongoose.Types.ObjectId(id);
  }
  
  // For unknown types, try to convert to string first then to ObjectId
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch (error) {
    throw new Error(`Invalid ObjectId: ${id}`);
  }
};