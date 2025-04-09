#!/bin/bash
# Direct deployment script that uses SSH to run commands directly on the EC2 instance

# Check if EC2 instance IP is provided
if [ -z "$1" ]; then
  echo "Usage: ./direct-deploy.sh <ec2-ip-address>"
  echo "Example: ./direct-deploy.sh 13.233.155.114"
  exit 1
fi

EC2_IP=$1
SSH_KEY="/Users/mayankkashyap/Downloads/my-aws-keypair.pem"

# Verify SSH key exists
if [ ! -f "$SSH_KEY" ]; then
  echo "ERROR: SSH key not found at $SSH_KEY"
  exit 1
fi

# Clone repository on EC2 instance
echo "Cloning repository on EC2 instance..."
ssh -i "$SSH_KEY" ubuntu@$EC2_IP << 'EOF'
  # Clone the repository if it doesn't exist
  if [ ! -d "~/gate-prep-app" ]; then
    echo "Cloning repository..."
    git clone https://github.com/mayankkashyap879/gate_prep_app.git ~/gate-prep-app
  else
    echo "Repository already exists, pulling latest changes..."
    cd ~/gate-prep-app
    git pull
  fi
  
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
  
  # Create required directories
  mkdir -p ~/gate-prep-app/certbot/conf ~/gate-prep-app/certbot/www
  
  # Run Docker Compose
  cd ~/gate-prep-app
  docker-compose build
  docker-compose up -d
  
  echo "Deployment complete! The application should be accessible at http://$EC2_IP"
EOF

echo "Deployment initiated on $EC2_IP"
echo "Wait a few minutes for the build process to complete, then access the application at:"
echo "http://$EC2_IP"