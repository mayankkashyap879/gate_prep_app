# GitHub Repository Setup

Follow these steps to set up a GitHub repository for the GATE Prep App.

## Creating a GitHub Repository

1. Sign in to your GitHub account
2. Click on the "+" icon in the top-right corner and select "New repository"
3. Name the repository (e.g., "gate-prep-app")
4. Add a description: "A comprehensive study planning and progress tracking platform for GATE CS/IT exam preparation"
5. Choose the repository visibility (Public or Private)
6. Check "Add a README file"
7. Choose an appropriate license if needed
8. Click "Create repository"

## Initializing Your Local Repository

1. Navigate to your project directory:
   ```bash
   cd /path/to/gate-prep-app
   ```

2. Initialize the git repository if not already done:
   ```bash
   git init
   ```

3. Add the GitHub repository as a remote:
   ```bash
   git remote add origin https://github.com/yourusername/gate-prep-app.git
   ```

4. Pull the initial README and license files:
   ```bash
   git pull origin main --allow-unrelated-histories
   ```

## Preparing Your First Commit

1. Review the .gitignore file to ensure sensitive and unnecessary files are excluded
2. Stage your files:
   ```bash
   git add .
   ```

3. Commit your changes:
   ```bash
   git commit -m "Initial project setup"
   ```

4. Push to GitHub:
   ```bash
   git push -u origin main
   ```

## Setting Up Branch Protection (Optional)

1. Go to your repository on GitHub
2. Click on "Settings" > "Branches"
3. Under "Branch protection rules", click "Add rule"
4. In the "Branch name pattern" field, enter "main"
5. Check options like:
   - "Require pull request reviews before merging"
   - "Require status checks to pass before merging"
   - "Include administrators"
6. Click "Create"

## Setting Up GitHub Actions (Optional)

Create a GitHub Actions workflow file to automatically run tests and checks:

1. Create a directory for GitHub Actions:
   ```bash
   mkdir -p .github/workflows
   ```

2. Create a workflow file:
   ```bash
   touch .github/workflows/main.yml
   ```

3. Add the following content to the file:
   ```yaml
   name: CI

   on:
     push:
       branches: [ main ]
     pull_request:
       branches: [ main ]

   jobs:
     build:
       runs-on: ubuntu-latest

       steps:
       - uses: actions/checkout@v2
       
       - name: Setup Node.js
         uses: actions/setup-node@v2
         with:
           node-version: '18'
           cache: 'npm'
           
       - name: Install dependencies
         run: |
           npm run install:all
           
       - name: Lint
         run: |
           cd frontend && npm run lint
           
       - name: Build
         run: |
           npm run build
   ```

4. Commit and push the workflow file:
   ```bash
   git add .github/workflows/main.yml
   git commit -m "Add GitHub Actions workflow"
   git push
   ```

## Final Steps

1. Update the README.md with:
   - Project description
   - Setup instructions
   - Contributing guidelines
   - License information

2. Add a CONTRIBUTING.md file with guidelines for contributors

3. Create necessary GitHub issue templates if needed

4. Set up GitHub project boards if you plan to use them for project management