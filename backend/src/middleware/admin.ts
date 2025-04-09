// backend/src/middleware/admin.ts
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { IUser } from '../models/User';

// Helper function to get user ID safely
const getUserId = (user: any): string | undefined => {
  if (!user) return undefined;
  return user.id || (user._id?.toString ? user._id.toString() : user._id);
};

const adminAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ msg: 'No authentication token, authorization denied' });
      return;
    }

    const userId = getUserId(req.user);
    if (!userId) {
      res.status(401).json({ msg: 'User ID not found' });
      return;
    }
    
    const user = await User.findById(userId) as IUser | null;
    
    if (!user) {
      res.status(404).json({ msg: 'User not found' });
      return;
    }
    
    if (user.role !== 'admin') {
      res.status(403).json({ msg: 'Access denied. Admin privileges required' });
      return;
    }

    // Add role to the request for use in other middleware/routes
    if (typeof req.user === 'object') {
      req.user.role = user.role as string;
    }
    
    next();
  } catch (err) {
    console.error('Admin middleware error:', err);
    res.status(500).json({ msg: 'Server error' });
    return;
  }
};

export default adminAuth;