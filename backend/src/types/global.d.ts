// src/types/global.d.ts
export {}; // Ensure this file is a module

declare global {
  namespace Express {
    interface User {
      _id: string;
      // Optionally, include additional properties if needed:
      // id: string;
      // role?: string;
    }
  }
}
