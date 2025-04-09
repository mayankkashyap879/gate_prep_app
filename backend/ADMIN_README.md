# GATE Prep App Admin Guide

This guide explains how to set up and use the admin features of the GATE Prep App.

## Admin Setup

1. **Create an Admin User**

   Run the following command to create an admin user:

   ```bash
   npm run seed:admin
   ```

   This creates a default admin user with:
   - Email: mayank@gateprep.app
   - Password: admin123

   Alternatively, you can register a new user and set them as admin by:
   - Adding their email to the `ADMIN_EMAILS` environment variable in `.env`
   - Example: `ADMIN_EMAILS=mayank@gateprep.app,anotheremail@example.com`

2. **Environment Configuration**

   Add this to your `.env` file:

   ```
   ADMIN_EMAILS=mayank@gateprep.app,youremail@example.com
   ```

## Admin Features

The admin panel provides tools to manage educational content:

### 1. Subject Management

- **View Subjects**: See all subjects with their details
- **Add Subjects**: Create new subjects with name, description, priority, etc.
- **Edit Subjects**: Modify existing subject information
- **Delete Subjects**: Remove subjects (this will also affect related quizzes/tests)

### 2. Quiz Management

- **View Quizzes**: List all quizzes with dates, subjects, and links
- **Add Quizzes**: Create individual quizzes
- **Edit Quizzes**: Update quiz details
- **Delete Quizzes**: Remove quizzes
- **Import from CSV**: Bulk import quizzes using CSV files

### 3. Test Series Management

- **View Tests**: See all test series with their details
- **Add Tests**: Create new test series
- **Edit Tests**: Update test series information
- **Delete Tests**: Remove test series
- **Import from CSV**: Bulk import test series using CSV files

## CSV Import Format

### Quizzes CSV Format

Your CSV for quizzes should include these columns:

- `Exam Name` - Name of the quiz
- `Quiz Links` - URL to the quiz
- `Exam Date` - Format: "Thursday, 1 August 2024" or "August 31, 2024"
- `Subject` - Subject name
- `Topics` - Comma-separated list of topics
- `Remarks` (optional) - Additional information

### Test Series CSV Format

Your CSV for test series should include these columns:

- `Exam Name` - Name of the test
- `Test Link` - URL to the test
- `Exam Date` - Format: "May 15, 2024"
- `Topics` - Comma-separated list of topics

## API Endpoints

Admin-only endpoints are protected and require admin authentication:

```
POST /api/auth/login             # Log in as admin user
GET  /api/admin/dashboard        # Get dashboard stats
GET  /api/admin/subjects         # Get all subjects
POST /api/admin/subjects         # Create a subject
PUT  /api/admin/subjects/:id     # Update a subject
DELETE /api/admin/subjects/:id   # Delete a subject
GET  /api/admin/quizzes          # Get all quizzes
POST /api/admin/quizzes          # Create a quiz
PUT  /api/admin/quizzes/:id      # Update a quiz
DELETE /api/admin/quizzes/:id    # Delete a quiz
POST /api/admin/quizzes/upload   # Upload quizzes CSV
GET  /api/admin/tests            # Get all tests
POST /api/admin/tests            # Create a test
PUT  /api/admin/tests/:id        # Update a test
DELETE /api/admin/tests/:id      # Delete a test
POST /api/admin/tests/upload     # Upload tests CSV
```

## Security Notes

- All admin routes are protected with both auth and admin middleware
- JWT tokens include the user's role
- Frontend checks for admin role before showing admin features

## Seeding Data

To populate the database with sample subjects, quizzes, and test series:

```bash
npm run seed
```

This will create sample subjects and import data from CSV files in the `/data` directory.