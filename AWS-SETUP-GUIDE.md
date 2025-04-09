# AWS EC2 Setup Guide for GATE Prep App

This guide walks you through the process of setting up an AWS EC2 instance for deploying the GATE Prep App.

## Step 1: Create an EC2 Instance

1. Sign in to the AWS Management Console.
2. Navigate to EC2 service.
3. Click "Launch Instance".

### Instance Details

- **Name**: GATE-Prep-App
- **AMI**: Ubuntu Server 22.04 LTS (64-bit x86)
- **Instance Type**: t2.micro (Free tier) or t2.small (recommended for better performance)
- **Key Pair**: Create a new key pair or use an existing one
  - If creating new: Name it (e.g., "gate-prep-key")
  - Download the key pair (.pem file)
  - Keep it secure and don't lose it!

### Network Settings

- **VPC**: Default VPC
- **Auto-assign Public IP**: Enable
- **Security Group**: Create a new security group with the following rules:
  - SSH (TCP/22) - Source: Your IP (for better security) or Anywhere (0.0.0.0/0)
  - HTTP (TCP/80) - Source: Anywhere (0.0.0.0/0)
  - HTTPS (TCP/443) - Source: Anywhere (0.0.0.0/0)
  - Custom TCP (3000) - Source: Anywhere (0.0.0.0/0) [Development only]
  - Custom TCP (5001) - Source: Anywhere (0.0.0.0/0) [Development only]
  - Custom TCP (27017) - Source: Your IP [Optional, for direct MongoDB access]

### Storage

- **Root Volume**: 8GB (minimum) to 30GB (recommended) gp2 (SSD)

4. Click "Launch Instance".

## Step 2: Connect to Your EC2 Instance

### For macOS/Linux Users

1. Open Terminal.
2. Navigate to the directory where your key pair file is located.
3. Set the right permissions for your key file:
   ```bash
   chmod 400 your-key-name.pem
   ```
4. Connect to your instance (replace with your actual public IP):
   ```bash
   ssh -i your-key-name.pem ubuntu@your-ec2-public-ip
   ```

### For Windows Users (using PuTTY)

1. Convert your .pem file to .ppk using PuTTYgen.
2. Open PuTTY.
3. Enter your EC2 public IP in the Host Name field.
4. Navigate to Connection > SSH > Auth > Credentials.
5. Browse and select your .ppk file.
6. Click "Open" to connect.
7. Login as "ubuntu".

## Step 3: Update System and Install Basic Packages

Once connected to your EC2 instance:

```bash
# Update package lists
sudo apt update

# Upgrade installed packages
sudo apt upgrade -y

# Install basic utilities
sudo apt install -y git curl wget unzip
```

## Step 4: Set Up Swap Space (Optional but Recommended)

If your instance has limited RAM, creating swap space can help prevent out-of-memory errors:

```bash
# Check if swap exists
sudo swapon --show

# Create a 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make swap permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Step 5: Install Docker and Docker Compose

Follow the Docker installation instructions from the DEPLOYMENT-GUIDE.md file.

## Step 6: Configure Firewall (Optional)

If you want an additional layer of security:

```bash
# Install UFW (Uncomplicated Firewall)
sudo apt install -y ufw

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow application ports (for development)
sudo ufw allow 3000/tcp
sudo ufw allow 5001/tcp

# Enable firewall
sudo ufw enable
```

## Step 7: Set Up Automatic Updates (Optional)

```bash
# Install unattended-upgrades
sudo apt install -y unattended-upgrades

# Configure automatic updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Step 8: Configure Hostname (Optional)

```bash
# Set hostname
sudo hostnamectl set-hostname gate-prep-app

# Update hosts file
echo "127.0.0.1 gate-prep-app" | sudo tee -a /etc/hosts
```

## Step 9: Domain Name Setup (Optional)

If you have a domain name:

1. Navigate to your domain registrar's DNS settings.
2. Add an A record pointing to your EC2 instance's public IP address.
   - Name: @ or subdomain (e.g., app)
   - Value: Your EC2 public IP
   - TTL: 3600 (or lower for faster propagation)

## Step 10: SSH Key Management (Optional)

To add another SSH key for access:

1. On your local machine, generate a new key pair:
   ```bash
   ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
   ```

2. On the EC2 instance, add the public key to authorized keys:
   ```bash
   echo "your-public-key-content" >> ~/.ssh/authorized_keys
   ```

## Troubleshooting SSH Connection Issues

If you're having trouble connecting to your EC2 instance:

1. **Check Security Group**: Ensure port 22 is open in your security group.
2. **Check Network ACLs**: If using a custom VPC, ensure network ACLs allow SSH traffic.
3. **Check Instance Status**: Verify the instance is running.
4. **Check Public IP**: Confirm you're using the correct public IP address.
5. **Check Key Permissions**: Ensure your key file has the correct permissions (chmod 400).
6. **Check Key Pair**: Verify you're using the correct key pair associated with the instance.
7. **Check EC2 System Log**: In the AWS Console, select your instance, click "Actions", then "Monitor and troubleshoot" > "Get system log".

## Next Steps

Once your EC2 instance is properly set up, proceed to the DEPLOYMENT-GUIDE.md file to deploy the GATE Prep App.