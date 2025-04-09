# Deployment Guide for GATE Prep App

This guide provides detailed instructions for deploying the GATE Prep App on an EC2 instance.

## Prerequisites

- An AWS account with EC2 permissions
- A domain name (optional but recommended)
- Basic knowledge of Linux commands

## Setting Up an EC2 Instance

1. **Launch an EC2 Instance**
   - Log in to your AWS Management Console
   - Navigate to EC2 Dashboard
   - Click "Launch Instance"
   - Choose Amazon Linux 2023 or Ubuntu 22.04
   - Select a t2.micro instance for testing (or larger for production)
   - Configure security group to allow HTTP (80), HTTPS (443), and SSH (22)
   - Launch the instance and save the key pair

2. **Connect to Your Instance**
   ```bash
   chmod 400 your-key-pair.pem
   ssh -i your-key-pair.pem ec2-user@your-ec2-public-dns
   ```

## System Configuration

1. **Update System Packages**
   ```bash
   # For Amazon Linux 2023
   sudo dnf update -y
   
   # For Ubuntu 22.04
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Node.js and npm**
   ```bash
   # For Amazon Linux 2023
   sudo dnf install -y nodejs npm
   
   # For Ubuntu 22.04
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

3. **Install MongoDB**
   ```bash
   # For Amazon Linux 2023
   sudo tee /etc/yum.repos.d/mongodb-org-6.0.repo > /dev/null << 'EOF'
   [mongodb-org-6.0]
   name=MongoDB Repository
   baseurl=https://repo.mongodb.org/yum/amazon/2023/mongodb-org/6.0/x86_64/
   gpgcheck=1
   enabled=1
   gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
   EOF
   
   sudo dnf install -y mongodb-org
   sudo systemctl start mongod
   sudo systemctl enable mongod
   
   # For Ubuntu 22.04
   wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
   sudo apt update
   sudo apt install -y mongodb-org
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

4. **Install Git**
   ```bash
   # For Amazon Linux 2023
   sudo dnf install -y git
   
   # For Ubuntu 22.04
   sudo apt install -y git
   ```

5. **Install PM2 (Process Manager)**
   ```bash
   sudo npm install -g pm2
   ```

## Deploying the Application

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/gate-prep-app.git
   cd gate-prep-app
   ```

2. **Install Dependencies and Build**
   ```bash
   # Install dependencies for main project, frontend, and backend
   npm run install:all
   
   # Build frontend and backend
   npm run build
   ```

3. **Configure Environment Variables**
   ```bash
   # For frontend
   cd frontend
   cp .env.example .env.local
   # Edit .env.local with production values
   nano .env.local
   
   # For backend
   cd ../backend
   cp .env.example .env
   # Edit .env with production values
   nano .env
   ```

   Important settings to configure:
   - `MONGODB_URI`: Update with your MongoDB connection string
   - `JWT_SECRET`: Set a strong random string for security
   - `NODE_ENV`: Set to "production"
   - `NEXT_PUBLIC_API_URL`: Set to your backend API URL

4. **Seed the Database (Optional)**
   ```bash
   cd ../backend
   npm run seed
   npm run seed:admin
   ```

5. **Start the Application with PM2**
   ```bash
   cd ..
   pm2 start npm --name "gate-prep-frontend" -- run start:frontend
   pm2 start npm --name "gate-prep-backend" -- run start:backend
   
   # Set PM2 to start on boot
   pm2 startup
   pm2 save
   ```

## Setting Up Nginx as Reverse Proxy

1. **Install Nginx**
   ```bash
   # For Amazon Linux 2023
   sudo dnf install -y nginx
   
   # For Ubuntu 22.04
   sudo apt install -y nginx
   ```

2. **Configure Nginx**
   ```bash
   # For Amazon Linux 2023
   sudo nano /etc/nginx/conf.d/gate-prep.conf
   
   # For Ubuntu 22.04
   sudo nano /etc/nginx/sites-available/gate-prep
   ```

   Add the following configuration:
   ```
   server {
       listen 80;
       server_name your-domain.com; # Or your EC2 public DNS if no domain
   
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   
       location /api {
           proxy_pass http://localhost:5001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable the Configuration and Restart Nginx**
   ```bash
   # For Amazon Linux 2023
   sudo systemctl restart nginx
   sudo systemctl enable nginx
   
   # For Ubuntu 22.04
   sudo ln -s /etc/nginx/sites-available/gate-prep /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   sudo systemctl enable nginx
   ```

## Setting Up HTTPS with Let's Encrypt (Optional but Recommended)

1. **Install Certbot**
   ```bash
   # For Amazon Linux 2023
   sudo dnf install -y certbot python3-certbot-nginx
   
   # For Ubuntu 22.04
   sudo apt install -y certbot python3-certbot-nginx
   ```

2. **Obtain and Install the Certificate**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Set Up Auto-renewal**
   ```bash
   sudo certbot renew --dry-run
   ```

## Monitoring and Maintenance

1. **View PM2 Logs**
   ```bash
   pm2 logs
   ```

2. **Monitor the Application**
   ```bash
   pm2 monit
   ```

3. **Restart the Application**
   ```bash
   pm2 restart all
   ```

4. **Pull Updates from Git**
   ```bash
   cd ~/gate-prep-app
   git pull
   npm run build
   pm2 restart all
   ```

## Backup and Restore MongoDB

1. **Backup**
   ```bash
   mongodump --out ~/mongodb-backups/$(date +"%Y-%m-%d")
   ```

2. **Restore**
   ```bash
   mongorestore ~/mongodb-backups/YYYY-MM-DD
   ```

## Troubleshooting

1. **Check Application Logs**
   ```bash
   pm2 logs
   ```

2. **Check Nginx Logs**
   ```bash
   sudo tail -f /var/log/nginx/access.log
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Check MongoDB Logs**
   ```bash
   sudo tail -f /var/log/mongodb/mongod.log
   ```

4. **Restart Services**
   ```bash
   pm2 restart all
   sudo systemctl restart nginx
   sudo systemctl restart mongod
   ```

## Security Best Practices

1. **Set up a Firewall**
   ```bash
   # For Ubuntu
   sudo ufw allow ssh
   sudo ufw allow http
   sudo ufw allow https
   sudo ufw enable
   ```

2. **Keep Software Updated**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Secure MongoDB**
   - Enable authentication
   - Configure MongoDB to only listen on localhost
   - Create a dedicated database user for the application