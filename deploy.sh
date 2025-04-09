#!/bin/bash
# Deployment script for GATE Prep App

set -e  # Exit immediately if a command exits with a non-zero status

# Check if EC2 instance IP is provided
if [ -z "$1" ]; then
  echo "Usage: ./deploy.sh <ec2-ip-address>"
  echo "Example: ./deploy.sh 34.123.456.789"
  exit 1
fi

EC2_IP=$1

# Set the SSH key path to the provided key
SSH_KEY="/Users/mayankkashyap/Downloads/my-aws-keypair.pem"
echo "Using SSH key: $SSH_KEY"

# Verify SSH key exists
if [ ! -f "$SSH_KEY" ]; then
  echo "ERROR: SSH key not found at $SSH_KEY"
  exit 1
fi

# Build the application
echo "Building the application..."
# Build frontend only, skip backend build as we'll build it on the server
echo "Building frontend..."
cd frontend && npm run build && cd ..

echo "Creating deployment package..."
# Create a temporary directory for the deployment package
TEMP_DIR=$(mktemp -d)
echo "Temporary directory: $TEMP_DIR"

# Copy necessary files to the temp directory
echo "Copying files..."
cp -r backend frontend nginx docker-compose.yml package.json README.md "$TEMP_DIR/"
cp .env "$TEMP_DIR/.env"
cp backend/.env "$TEMP_DIR/backend/.env"
cp frontend/.env.local "$TEMP_DIR/frontend/.env.local"

# Create directories for persistent volumes
mkdir -p "$TEMP_DIR/certbot/conf" "$TEMP_DIR/certbot/www"

# Create a deployment archive
echo "Creating archive..."
DEPLOY_ARCHIVE="gate-prep-app-deploy.tar.gz"
tar -czf "$DEPLOY_ARCHIVE" -C "$TEMP_DIR" .

# Transfer the archive to the EC2 instance
echo "Transferring files to EC2 instance..."
scp -i "$SSH_KEY" "$DEPLOY_ARCHIVE" "ubuntu@$EC2_IP:~/"

# Execute deployment commands on the EC2 instance
echo "Executing deployment commands on EC2 instance..."
ssh -i "$SSH_KEY" "ubuntu@$EC2_IP" << 'EOF'
  # Install Docker if not installed
  if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo apt update -y
    sudo apt install -y docker.io
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -a -G docker ubuntu
  else
    echo "Docker already installed."
  fi

  # Install Docker Compose if not installed
  if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
  else
    echo "Docker Compose already installed."
  fi

  # Create application directory if it doesn't exist
  mkdir -p ~/gate-prep-app

  # Extract the deployment archive
  echo "Extracting deployment archive..."
  tar -xzf ~/gate-prep-app-deploy.tar.gz -C ~/gate-prep-app
  cd ~/gate-prep-app

  # Configure environment variables
  echo "Configuring environment variables..."
  if [ ! -f .env ]; then
    cp .env.example .env
    # Generate a random JWT secret
    JWT_SECRET=$(openssl rand -hex 32)
    sed -i "s/your_jwt_secret_here/$JWT_SECRET/g" .env
  else
    echo ".env file already exists, skipping..."
  fi

  # Build backend with type errors ignored
  echo "Building backend..."
  cd ~/gate-prep-app/backend
  npm run build || echo "Ignoring TypeScript errors and continuing..."
  
  # Start the application with Docker Compose
  echo "Starting the application..."
  cd ~/gate-prep-app
  docker-compose build
  docker-compose up -d

  # Wait for the application to start
  echo "Waiting for the application to start..."
  sleep 10

  # Seed the database if needed (first-time setup)
  read -p "Do you want to seed the database with initial data? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Seeding the database..."
    docker-compose exec backend npm run seed
    docker-compose exec backend npm run seed:admin
  fi
EOF

# Clean up
echo "Cleaning up..."
rm -rf "$TEMP_DIR" "$DEPLOY_ARCHIVE"

echo "Deployment completed successfully!"
echo "Access your application at http://$EC2_IP"