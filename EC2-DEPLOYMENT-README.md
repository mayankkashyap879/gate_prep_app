# GATE Prep App EC2 Deployment

This repository contains a GATE Prep App built with Next.js, MongoDB, and Node.js. This guide will help you deploy the application to an AWS EC2 instance.

## Deployment Process

We've provided detailed guides for setting up and deploying the GATE Prep App:

1. [AWS EC2 Setup Guide](AWS-SETUP-GUIDE.md) - Follow this guide first to set up your EC2 instance correctly.
2. [Deployment Guide](DEPLOYMENT-GUIDE.md) - Once your EC2 instance is ready, use this guide to deploy the application.

## Quick Reference

### EC2 Instance Configuration

- Ubuntu Server 22.04 LTS
- Security Group: Open ports 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (Frontend), 5001 (Backend)
- Install Docker and Docker Compose

### Application Stack

- Frontend: Next.js
- Backend: Node.js, Express
- Database: MongoDB
- Web Server: Nginx

### Connection Details

- MongoDB username: mayankksp
- MongoDB password: Rnw@085671
- Admin emails: admin@gateprep.com, mayank@gateprep.com

### Environment Variables

Main environment variables:
```
MONGODB_URI=mongodb://mayankksp:Rnw%40085671@mongodb:27017/gate_prep_app?authSource=admin
JWT_SECRET=gate_prep_app_secret_key_2025
PORT=5001
NODE_ENV=production
```

## Troubleshooting

If you encounter issues during deployment, check:

1. **SSH Connection** - Ensure your security group settings allow SSH from your IP
2. **Docker Errors** - Check container logs with `docker-compose logs`
3. **Application Errors** - Check frontend and backend container logs separately
4. **MongoDB Connection** - Verify the MongoDB container is running and credentials are correct

## Maintenance

To update the application after deployment:

```bash
cd ~/gate-prep-app
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

For more details, consult the full deployment guides linked above.

## Support

If you need additional assistance, please contact:
- Email: mayank@gateprep.com