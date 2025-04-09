// backend/src/types/custom.d.ts
import { RequestUser } from '../middleware/auth';

declare global {
  namespace Express {
    // Properly extend the existing User type from Passport
    // This merges our RequestUser with Passport's User type
    interface User extends RequestUser {}
  }
}

// This file is used to extend existing types
export {};