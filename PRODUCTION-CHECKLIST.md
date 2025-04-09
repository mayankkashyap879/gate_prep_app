# Production Deployment Checklist

Use this checklist to ensure your GATE Prep application is ready for production deployment.

## Front-end

- [ ] Update environment variables in `.env.local` or `.env.production`:
  - [ ] Set `NEXT_PUBLIC_API_URL` to production API URL
  - [ ] Remove any development-specific environment variables

- [ ] Build and test the production build:
  ```bash
  cd frontend
  npm run build
  npm run start
  ```

- [ ] Check for console errors and warnings
- [ ] Verify that images and assets load correctly
- [ ] Test all major features and user flows
- [ ] Optimize images and assets if needed

## Back-end

- [ ] Update environment variables in `.env`:
  - [ ] Set `NODE_ENV=production`
  - [ ] Set a strong, unique `JWT_SECRET`
  - [ ] Update `MONGODB_URI` to production database
  - [ ] Configure admin emails with `ADMIN_EMAILS`

- [ ] Ensure database indexes are created:
  ```bash
  cd backend
  npm run build
  ```

- [ ] Run security checks on dependencies:
  ```bash
  npm audit
  ```

- [ ] Consider implementing rate limiting for API endpoints
- [ ] Ensure proper validation for all API inputs
- [ ] Set up database backup strategy

## Database

- [ ] Set up authentication for MongoDB
- [ ] Configure MongoDB to only listen on localhost or within your VPC
- [ ] Create database users with appropriate permissions
- [ ] Enable encryption at rest if available
- [ ] Verify backup and restore procedures
- [ ] Check database performance and indexes

## Docker & Deployment

- [ ] Remove development volumes in docker-compose.yml
- [ ] Set appropriate restart policies for containers
- [ ] Configure appropriate container resource limits
- [ ] Verify that all secrets are externalized (not hardcoded)
- [ ] Ensure proper log rotation is configured

## Security

- [ ] Set up HTTPS with valid SSL certificate
- [ ] Configure security headers in Nginx
- [ ] Implement Content Security Policy (CSP)
- [ ] Set up firewall to only expose necessary ports
- [ ] Configure automated security updates
- [ ] Remove default credentials and test accounts

## Monitoring & Maintenance

- [ ] Set up application logging
- [ ] Configure error monitoring (optional: Sentry, LogRocket, etc.)
- [ ] Set up system monitoring (CPU, memory, disk usage)
- [ ] Create a rollback plan in case of deployment issues
- [ ] Document deployment and recovery procedures
- [ ] Set up alerts for critical issues

## Performance

- [ ] Enable Nginx caching for static assets
- [ ] Configure appropriate cache headers
- [ ] Verify frontend bundle size is optimized
- [ ] Set up database query monitoring
- [ ] Check for N+1 query issues
- [ ] Test application under expected load

## Compliance

- [ ] Ensure privacy policy and terms of service are up to date
- [ ] Verify that user data is properly secured
- [ ] Implement necessary cookie banners if required

## Final Verification

- [ ] Test the entire application as an end user
- [ ] Verify all integrations work properly
- [ ] Create at least one test account and verify registration flow
- [ ] Have a team member review the deployment

## Post-Deployment

- [ ] Monitor application logs for errors
- [ ] Verify application is accessible from intended locations
- [ ] Check all key functionality works in production
- [ ] Document any issues or lessons learned