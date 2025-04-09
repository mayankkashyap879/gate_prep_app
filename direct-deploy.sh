#!/bin/bash
# Direct deployment script that uses SSH to run commands directly on the EC2 instance

# Configuration
EC2_IP="13.201.190.191"
DOMAIN="gateprep.app"
SSH_KEY="/Users/mayankkashyap/Downloads/my-aws-keypair.pem"
EMAIL="mayank@gateprep.app"

# Prompt for Google OAuth credentials
read -p "Enter Google OAuth Client ID: " GOOGLE_CLIENT_ID
read -p "Enter Google OAuth Client Secret: " GOOGLE_CLIENT_SECRET

# Verify required values
if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
  echo "ERROR: Google OAuth credentials are required"
  exit 1
fi

# Verify SSH key exists
if [ ! -f "$SSH_KEY" ]; then
  echo "ERROR: SSH key not found at $SSH_KEY"
  exit 1
fi

# Ensure SSH key has correct permissions
chmod 400 "$SSH_KEY"

echo "Waiting for EC2 instance to be ready..."
until ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=5 ubuntu@$EC2_IP "echo SSH connection successful" 2>/dev/null; do
  echo "Waiting for SSH connection to be available..."
  sleep 10
done

echo "SSH connection established!"

# Clone repository on EC2 instance
echo "Deploying application to EC2 instance..."
# Use "EOF" instead of 'EOF' to allow variable expansion
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$EC2_IP << EOF
  # Export Google OAuth variables
  export GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID"
  export GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET"
  # Install Docker and Docker Compose if not already installed
  if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo apt update -y
    sudo apt install -y docker.io
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -a -G docker ubuntu
  fi
  
  if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
  fi

  # Clone the repository if it doesn't exist
  if [ ! -d "$HOME/gate-prep-app" ]; then
    echo "Cloning repository..."
    git clone https://github.com/mayankkashyap879/gate_prep_app.git ~/gate-prep-app
  else
    echo "Repository already exists, pulling latest changes..."
    cd ~/gate-prep-app
    git pull
  fi

  cd ~/gate-prep-app

  # Create required directories
  mkdir -p uploads
  mkdir -p certbot/conf
  mkdir -p certbot/www
  mkdir -p nginx
  
  # Create .env file
  cat > .env << ENVEOF
# Environment variables for the GATE Prep App

# MongoDB connection
MONGODB_URI=mongodb://mayankksp:Rnw%40085671@mongodb:27017/gate_prep_app?authSource=admin

# JWT configuration
JWT_SECRET=gate_prep_app_secret_key_2025
JWT_EXPIRES_IN=7d

# Server configuration
PORT=5001
NODE_ENV=production

# Admin emails
ADMIN_EMAILS=mayank@gateprep.app

# Google OAuth Configuration
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
GOOGLE_CALLBACK_URL=https://gateprep.app/api/auth/google/callback
GOOGLE_CALLBACK_URL_HTTP=http://gateprep.app/api/auth/google/callback
FRONTEND_URL=https://gateprep.app
ENVEOF

  # Update backend Dockerfile to ignore TypeScript errors
  cat > backend/Dockerfile << DOCKEREOF
# Use Node.js 18 as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build TypeScript code
RUN npm run build && echo '{"name":"backend-dist"}' > ./dist/package.json

# Expose port 5001
EXPOSE 5001

# Start the application
CMD ["npm", "start"]
DOCKEREOF

  # Create/update docker-compose.yml
  cat > docker-compose.yml << COMPOSEEOF
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://gateprep.app/api
    depends_on:
      - backend
    restart: unless-stopped
    volumes:
      - /app/node_modules

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5001:5001"
    environment:
      - MONGODB_URI=mongodb://mayankksp:Rnw%40085671@mongodb:27017/gate_prep_app?authSource=admin
      - JWT_SECRET=\${JWT_SECRET:-gate_prep_app_secret_key_2025}
      - PORT=5001
      - NODE_ENV=\${NODE_ENV:-production}
      - ADMIN_EMAILS=\${ADMIN_EMAILS:-mayank@gateprep.app}
      - GOOGLE_CLIENT_ID=\${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=\${GOOGLE_CLIENT_SECRET}
      - GOOGLE_CALLBACK_URL=https://gateprep.app/api/auth/google/callback
      - GOOGLE_CALLBACK_URL_HTTP=http://gateprep.app/api/auth/google/callback
      - FRONTEND_URL=https://gateprep.app
    depends_on:
      - mongodb
    restart: unless-stopped
    volumes:
      - /app/node_modules
      - ./backend/uploads:/app/uploads

  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: mayankksp
      MONGO_INITDB_ROOT_PASSWORD: Rnw@085671

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx:/etc/nginx/conf.d
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  mongodb_data:
COMPOSEEOF

  # Create/update nginx configuration
  mkdir -p nginx
  cat > nginx/default.conf << NGINXEOF
# HTTP server - redirects to HTTPS
server {
    listen 80;
    server_name gateprep.app www.gateprep.app;
    
    # For Let's Encrypt certificate renewal
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all HTTP requests to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name gateprep.app www.gateprep.app;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/gateprep.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gateprep.app/privkey.pem;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Frontend
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Backend API
    location /api {
        proxy_pass http://backend:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}

# Default server for IP address access
server {
    listen 80 default_server;
    server_name _;
    
    # Frontend
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Backend API
    location /api {
        proxy_pass http://backend:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXEOF

  # Create initial certbot configuration
  echo "Setting up SSL certificates..."
  mkdir -p certbot/conf certbot/www
  
  # Run nginx container alone to handle certbot challenges
  echo "Starting temporary nginx for SSL setup..."
  cat > docker-compose.ssl.yml << EOF
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx:/etc/nginx/conf.d
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    restart: unless-stopped
EOF

  # Create temporary nginx config for certbot
  cat > nginx/default.conf.temp << 'EOFNGINX'
server {
    listen 80;
    server_name gateprep.app www.gateprep.app;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 200 "Let's Encrypt setup in progress";
    }
}
EOFNGINX

  cp nginx/default.conf.temp nginx/default.conf
  
  # Start temporary nginx
  docker-compose -f docker-compose.ssl.yml down
  docker-compose -f docker-compose.ssl.yml up -d

  # Wait for nginx to start
  sleep 5
  
  # Check if certificates already exist
  if [ ! -d "certbot/conf/live/gateprep.app" ]; then
    # Generate the certificates
    echo "Obtaining SSL certificates..."
    docker run --rm -v "$(pwd)/certbot/conf:/etc/letsencrypt" -v "$(pwd)/certbot/www:/var/www/certbot" \
      certbot/certbot certonly --webroot --webroot-path=/var/www/certbot \
      --email mayank@gateprep.app --agree-tos --no-eff-email \
      -d gateprep.app -d www.gateprep.app --non-interactive
  else
    echo "SSL certificates already exist, skipping certificate generation."
  fi

  # Stop temporary nginx
  docker-compose -f docker-compose.ssl.yml down
  
  # Restore the proper nginx configuration
  mv nginx/default.conf.temp nginx/default.conf.bak
  
  # Stop any running containers, build new ones, and start
  echo "Building and starting Docker containers..."
  docker-compose down
  docker-compose build
  docker-compose up -d

  # Wait for services to start
  echo "Waiting for services to start..."
  sleep 10
  
  # Setup auto-renewal for SSL certificates
  echo "Setting up certificate renewal cron job..."
  (crontab -l 2>/dev/null; echo "0 3 * * * cd $HOME/gate-prep-app && docker run --rm -v $HOME/gate-prep-app/certbot/conf:/etc/letsencrypt -v $HOME/gate-prep-app/certbot/www:/var/www/certbot certbot/certbot renew --webroot --webroot-path=/var/www/certbot && docker-compose restart nginx") | crontab -
  
  # Check status
  echo "Container status:"
  docker-compose ps
  
  echo "Deployment completed! The application is now accessible at:"
  echo "https://gateprep.app"
EOF

echo "Deployment initiated on $EC2_IP"
echo "Wait a few minutes for the build process to complete, then access the application at:"
echo "https://$DOMAIN"
echo "The application is also accessible via IP at: http://$EC2_IP"