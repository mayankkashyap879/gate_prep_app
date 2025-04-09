# AWS EC2 Deployment Instructions

Follow these steps to deploy your GATE Prep App to an AWS EC2 instance.

## Step 1: Launch an EC2 Instance

1. Sign in to your AWS Management Console
2. Navigate to EC2 Dashboard
3. Click "Launch Instance"
4. Choose "Ubuntu Server 22.04 LTS" as your AMI
5. Select a t2.micro instance (free tier eligible) or t2.small/medium for better performance
6. Configure instance details (use default settings for basic setup)
7. Add storage (8GB is sufficient for a basic setup)
8. Add tags (optional: add a Name tag for easy identification)
9. Configure Security Group:
   - Allow SSH (port 22) from your IP
   - Allow HTTP (port 80) from anywhere
   - Allow HTTPS (port 443) from anywhere
10. Review and Launch
11. Select your key pair "my-aws-keypair.pem" or create a new one
12. Launch the instance

## Step 2: Connect to Your EC2 Instance

1. Once your instance is running, note its Public IPv4 address
2. Connect to your instance:
   ```bash
   ssh -i "/Users/mayankkashyap/Downloads/my-aws-keypair.pem" ubuntu@your-ec2-ip-address
   ```
3. Install initial dependencies:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y git curl
   ```

## Step 3: Deploy Using the Script

Once you've verified that you can connect to your EC2 instance, you can deploy using the deployment script:

1. From your local machine (not the EC2 instance), navigate to your project directory:
   ```bash
   cd /Users/mayankkashyap/gate-prep-app
   ```

2. Run the deployment script with your EC2 IP address:
   ```bash
   ./deploy.sh your-ec2-ip-address
   ```

3. The script will:
   - Build your application
   - Create a deployment package
   - Transfer it to your EC2 instance
   - Set up Docker and Docker Compose
   - Start your application containers

## Step 4: Access Your Application

1. Once deployment is complete, you can access your application at:
   ```
   http://your-ec2-ip-address
   ```

2. For a production deployment, you should set up a domain name and SSL certificate. The deployment script has already included Nginx configuration for this.

## Troubleshooting

If you encounter issues during deployment:

1. SSH into your EC2 instance to check logs:
   ```bash
   ssh -i "/Users/mayankkashyap/Downloads/my-aws-keypair.pem" ubuntu@your-ec2-ip-address
   cd ~/gate-prep-app
   docker-compose logs
   ```

2. Check if containers are running:
   ```bash
   docker-compose ps
   ```

3. If a container is not running, check its specific logs:
   ```bash
   docker-compose logs frontend
   docker-compose logs backend
   docker-compose logs mongodb
   ```

4. Restart the containers:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

## Setting Up a Domain Name (Optional)

1. Register a domain name with a provider like Route53, Namecheap, or GoDaddy
2. Point your domain's DNS A record to your EC2 instance's IP address
3. Update the Nginx configuration in `~/gate-prep-app/nginx/default.conf` to use your domain name
4. Set up SSL with Let's Encrypt:
   ```bash
   cd ~/gate-prep-app
   docker-compose run --rm certbot certonly --webroot -w /var/www/certbot -d your-domain.com
   ```
5. Uncomment the HTTPS server block in the Nginx configuration
6. Restart Nginx:
   ```bash
   docker-compose restart nginx
   ```