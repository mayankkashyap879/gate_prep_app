# Backend Scripts

This directory contains utility scripts for the backend.

## Migration Scripts

### Study Session Migration

The `migrate-study-sessions.ts` script moves study sessions from the separate `StudySession` collection into the embedded `studySessions` array in the `User` model. This consolidates study session data directly within the user document.

To run the migration:

```bash
npm run migrate:study-sessions
```

This migration should be run once after deploying the updated code that uses the embedded study sessions model. After successful migration, the application will automatically use the embedded study sessions, and the separate collection can eventually be removed.

## Seeding Scripts

### Admin User

- `seed-admin.ts`: Creates an admin user if one doesn't exist
- `reset-admin.ts`: Resets the admin user's password

To seed an admin user:

```bash
npm run seed:admin
```

To reset the admin password:

```bash
npm run reset:admin
```

### Sample Data

- `seed-data.ts`: Seeds the database with sample subjects, quizzes, and tests

To seed sample data:

```bash
npm run seed
```