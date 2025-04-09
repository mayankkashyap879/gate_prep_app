// backend/src/middleware/auth.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Augment the Express.User interface instead of Express.Request
declare global {
  namespace Express {
    interface User {
      id: string;
      role?: string;
    }
  }
}

const auth = (req: Request, res: Response, next: NextFunction): void => {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    res.status(401).json({ msg: 'No token, authorization denied' });
    return;
  }

  // Verify token
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';
    // Cast decoded token to an object with a user property of type Express.User
    const decoded = jwt.verify(token, JWT_SECRET) as { user: Express.User };

    // Set user information on request
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
    return;
  }
};

export default auth;
