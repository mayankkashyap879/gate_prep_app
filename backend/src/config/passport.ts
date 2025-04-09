// backend/src/config/passport.ts
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User';

// Configure passport
const setupPassport = () => {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
  const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/api/auth/google/callback';

  // Only initialize Google OAuth if credentials are provided
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
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
  } else {
    console.warn('Google OAuth is disabled: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables');
  }

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
};

export default setupPassport;