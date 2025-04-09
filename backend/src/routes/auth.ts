// backend/src/routes/auth.ts
import express, { Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User';
import auth from '../middleware/auth';

const router = express.Router();

// Configure passport
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/api/auth/google/callback';

// Helper function to get user ID safely
const getUserId = (user: any): string | undefined => {
  if (!user) return undefined;
  return user.id || (user._id?.toString ? user._id.toString() : user._id);
};

// Google OAuth strategy setup
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: CALLBACK_URL,
      scope: ['profile', 'email']
    },
    async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        // Check if user exists
        let user = await User.findOne({ googleId: profile.id });
        
        if (!user) {
          // Check if email already exists
          if (profile.emails && profile.emails[0].value) {
            user = await User.findOne({ email: profile.emails[0].value });
            
            if (user) {
              // Email exists but not linked to Google - update user
              user.googleId = profile.id;
              if (profile.photos && profile.photos[0].value) {
                user.picture = profile.photos[0].value;
              }
              await user.save();
            }
          }
          
          // If still no user, create a new one
          if (!user && profile.emails && profile.emails[0].value) {
            // Set as admin if it's a predefined admin email
            const isAdmin = process.env.ADMIN_EMAILS ? 
              process.env.ADMIN_EMAILS.split(',').includes(profile.emails[0].value.toLowerCase()) : 
              profile.emails[0].value.toLowerCase() === 'admin@gateprep.com';
              
            // Default deadline is 6 months from now
            const defaultDeadline = new Date();
            defaultDeadline.setMonth(defaultDeadline.getMonth() + 6);
            
            user = new User({
              googleId: profile.id,
              name: profile.displayName,
              email: profile.emails[0].value,
              picture: profile.photos && profile.photos[0].value ? profile.photos[0].value : undefined,
              role: isAdmin ? 'admin' : 'user',
              deadline: defaultDeadline,
              dailyTarget: {
                minimum: 60, // 1 hour
                moderate: 120, // 2 hours
                maximum: 180, // 3 hours
                custom: 120 // Default 2 hours
              }
            });
            
            await user.save();
          }
        }
        
        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

// Passport serialization/deserialization
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done: any) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// @route   POST api/auth/admin-login
// @desc    Admin login with email/password
// @access  Public
router.post(
  '/admin-login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body;

    try {
      // Check if user exists and is an admin
      let user = await User.findOne({ email });

      if (!user) {
        res.status(400).json({ msg: 'Invalid credentials' });
        return;
      }

      // Check if user is an admin
      if (user.role !== 'admin') {
        res.status(403).json({ msg: 'Not authorized as admin' });
        return;
      }

      // Compare passwords - only for users with passwords
      if (!user.password) {
        res.status(400).json({ msg: 'This account uses Google Sign-In. Please login with Google.' });
        return;
      }

      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        res.status(400).json({ msg: 'Invalid credentials' });
        return;
      }

      // Generate JWT
      const payload = {
        user: {
          id: user.id || user._id,
          role: user.role
        }
      };

      // Use the same JWT_SECRET value from .env
      const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';
      
      jwt.sign(
        payload,
        JWT_SECRET,
        { expiresIn: '7d' },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/auth/google
// @desc    Authenticate with Google
// @access  Public
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// @route   GET api/auth/google/callback
// @desc    Google auth callback
// @access  Public
router.get(
  '/google/callback',
  passport.authenticate('google', { 
    session: false, 
    failureRedirect: 'http://localhost:3000/login?error=auth_failed' 
  }),
  (req: Request, res: Response) => {
    // Generate JWT
    const user = req.user as any;
    
    if (!user) {
      return res.redirect('http://localhost:3000/login?error=no_user');
    }
    
    const payload = {
      user: {
        id: user.id || user._id,
        role: user.role
      }
    };
    
    // Use the JWT_SECRET from env
    const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';
    
    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) {
          console.error('JWT Error:', err);
          return res.redirect('http://localhost:3000/login?error=token_error');
        }
        
        // Redirect to frontend with token
        res.redirect(`http://localhost:3000/auth/success?token=${token}`);
      }
    );
  }
);

// @route   GET api/auth/user
// @desc    Get user data
// @access  Private
router.get('/user', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req.user);
    if (!userId) {
      res.status(404).json({ msg: 'User ID not found' });
      return;
    }
    
    const user = await User.findById(userId).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/auth/update-deadline
// @desc    Update user's exam deadline
// @access  Private
router.put(
  '/update-deadline',
  [
    auth,
    check('deadline', 'Please provide a valid deadline date').isISO8601()
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const userId = getUserId(req.user);
      if (!userId) {
        res.status(404).json({ msg: 'User ID not found' });
        return;
      }
      
      let user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ msg: 'User not found' });
        return;
      }

      user.deadline = new Date(req.body.deadline);
      await user.save();

      res.json(user);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  }
);

// @route   PUT api/auth/select-subjects
// @desc    Update user's selected subjects and priorities
// @access  Private
router.put('/select-subjects', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { subjects, priorities } = req.body;
    
    // Validate subjects array
    if (!Array.isArray(subjects)) {
      res.status(400).json({ msg: 'Subjects must be an array' });
      return;
    }
    
    // Create update object
    const updateObj: any = { selectedSubjects: subjects };
    
    // Add priorities if provided
    if (priorities && typeof priorities === 'object') {
      updateObj.subjectPriorities = priorities;
    }
    
    // Update user
    const userId = getUserId(req.user);
    if (!userId) {
      res.status(404).json({ msg: 'User ID not found' });
      return;
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      updateObj,
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/auth/update-plan
// @desc    Update user's study plan
// @access  Private
router.put(
  '/update-plan',
  [
    auth,
    check('selectedPlan', 'Please provide a valid plan type').isIn(['minimum', 'moderate', 'maximum', 'custom']),
    check('customTarget', 'Please provide a valid custom target').optional().isNumeric()
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const userId = getUserId(req.user);
      if (!userId) {
        res.status(404).json({ msg: 'User ID not found' });
        return;
      }
      
      let user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ msg: 'User not found' });
        return;
      }

      user.selectedPlan = req.body.selectedPlan;
      
      if (req.body.selectedPlan === 'custom' && req.body.customTarget) {
        user.dailyTarget.custom = parseInt(req.body.customTarget);
      }
      
      await user.save();

      res.json(user);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  }
);

export default router;
