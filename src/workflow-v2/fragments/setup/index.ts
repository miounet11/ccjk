/**
 * Setup Fragments
 *
 * Fragments for environment setup and initialization
 */

import type { Fragment } from '../../types.js'

export const setupFragments: Fragment[] = [
  {
    id: 'setup-nodejs',
    name: 'Setup Node.js Environment',
    description: 'Initialize a Node.js project with package.json and dependencies',
    category: 'setup',
    steps: [
      {
        id: 'check-node',
        name: 'Check Node.js Installation',
        description: 'Verify Node.js is installed and get version',
        command: 'node --version',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Node.js is not installed',
        },
        errorHandling: {
          strategy: 'abort',
          maxAttempts: 1,
        },
      },
      {
        id: 'init-package',
        name: 'Initialize Package.json',
        description: 'Create package.json if it does not exist',
        command: '[ -f package.json ] || npm init -y',
        validation: {
          type: 'file_exists',
          condition: 'package.json',
          errorMessage: 'Failed to create package.json',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'install-deps',
        name: 'Install Dependencies',
        description: 'Install all project dependencies',
        command: 'npm install',
        dependencies: ['init-package'],
        timeout: 300,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to install dependencies',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 3,
        },
      },
    ],
    requirements: {
      tools: ['node', 'npm'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['nodejs', 'javascript', 'package-manager', 'setup'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'setup-python',
    name: 'Setup Python Environment',
    description: 'Initialize a Python project with virtual environment',
    category: 'setup',
    steps: [
      {
        id: 'check-python',
        name: 'Check Python Installation',
        description: 'Verify Python is installed and get version',
        command: 'python3 --version',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Python 3 is not installed',
        },
        errorHandling: {
          strategy: 'abort',
          maxAttempts: 1,
        },
      },
      {
        id: 'create-venv',
        name: 'Create Virtual Environment',
        description: 'Create a Python virtual environment',
        command: 'python3 -m venv venv',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to create virtual environment',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'activate-venv',
        name: 'Activate Virtual Environment',
        description: 'Activate the Python virtual environment',
        command: 'source venv/bin/activate',
        dependencies: ['create-venv'],
        platform: 'linux',
        validation: {
          type: 'custom',
          condition: 'check_venv_active',
          errorMessage: 'Failed to activate virtual environment',
        },
      },
      {
        id: 'install-reqs',
        name: 'Install Requirements',
        description: 'Install Python dependencies from requirements.txt',
        command: 'pip install -r requirements.txt',
        dependencies: ['activate-venv'],
        timeout: 300,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to install requirements',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 3,
        },
      },
    ],
    requirements: {
      tools: ['python3', 'pip'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['python', 'virtualenv', 'pip', 'setup'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'setup-git',
    name: 'Setup Git Repository',
    description: 'Initialize git repository and configure basic settings',
    category: 'setup',
    steps: [
      {
        id: 'init-git',
        name: 'Initialize Git Repository',
        description: 'Create a new git repository',
        command: '[ -d .git ] || git init',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to initialize git repository',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'config-git',
        name: 'Configure Git User',
        description: 'Set git user name and email',
        script: `
          git config user.name || git config user.name "CCJK User"
          git config user.email || git config user.email "user@ccjk.local"
        `,
        dependencies: ['init-git'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to configure git user',
        },
      },
      {
        id: 'create-gitignore',
        name: 'Create .gitignore',
        description: 'Create a basic .gitignore file',
        script: `
          [ -f .gitignore ] || cat > .gitignore << EOF
          node_modules/
          dist/
          build/
          .env
          *.log
          .DS_Store
          EOF
        `,
        dependencies: ['init-git'],
        validation: {
          type: 'file_exists',
          condition: '.gitignore',
          errorMessage: 'Failed to create .gitignore',
        },
      },
      {
        id: 'initial-commit',
        name: 'Initial Commit',
        description: 'Create initial commit with all files',
        command: 'git add . && git commit -m "Initial commit"',
        dependencies: ['config-git', 'create-gitignore'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to create initial commit',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['git'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['git', 'vcs', 'version-control', 'setup'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'setup-docker',
    name: 'Setup Docker Environment',
    description: 'Initialize Docker configuration with Dockerfile and docker-compose',
    category: 'setup',
    steps: [
      {
        id: 'check-docker',
        name: 'Check Docker Installation',
        description: 'Verify Docker is installed and running',
        command: 'docker --version',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Docker is not installed',
        },
        errorHandling: {
          strategy: 'abort',
          maxAttempts: 1,
        },
      },
      {
        id: 'create-dockerfile',
        name: 'Create Dockerfile',
        description: 'Generate a basic Dockerfile for the project',
        script: `
          [ -f Dockerfile ] || cat > Dockerfile << EOF
          FROM node:18-alpine
          WORKDIR /app
          COPY package*.json ./
          RUN npm install
          COPY . .
          EXPOSE 3000
          CMD ["npm", "start"]
          EOF
        `,
        dependencies: ['check-docker'],
        validation: {
          type: 'file_exists',
          condition: 'Dockerfile',
          errorMessage: 'Failed to create Dockerfile',
        },
      },
      {
        id: 'create-dockerignore',
        name: 'Create .dockerignore',
        description: 'Create .dockerignore to optimize build context',
        script: `
          [ -f .dockerignore ] || cat > .dockerignore << EOF
          node_modules/
          .git
          .gitignore
          README.md
          .env
          dist/
          build/
          *.log
          .DS_Store
          EOF
        `,
        dependencies: ['check-docker'],
        validation: {
          type: 'file_exists',
          condition: '.dockerignore',
          errorMessage: 'Failed to create .dockerignore',
        },
      },
      {
        id: 'create-compose',
        name: 'Create Docker Compose',
        description: 'Create docker-compose.yml for multi-service setup',
        script: `
          [ -f docker-compose.yml ] || cat > docker-compose.yml << EOF
          version: '3.8'
          services:
            app:
              build: .
              ports:
                - "3000:3000"
              environment:
                - NODE_ENV=production
              restart: unless-stopped
          EOF
        `,
        dependencies: ['create-dockerfile'],
        validation: {
          type: 'file_exists',
          condition: 'docker-compose.yml',
          errorMessage: 'Failed to create docker-compose.yml',
        },
      },
      {
        id: 'test-build',
        name: 'Test Docker Build',
        description: 'Test that the Docker image builds successfully',
        command: 'docker build -t test-image .',
        dependencies: ['create-dockerfile', 'create-dockerignore'],
        timeout: 600,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Docker build failed',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
    ],
    requirements: {
      tools: ['docker'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['docker', 'container', 'deployment', 'setup'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'setup-env',
    name: 'Setup Environment Variables',
    description: 'Create and configure environment variable files',
    category: 'setup',
    steps: [
      {
        id: 'create-env-example',
        name: 'Create .env.example',
        description: 'Create example environment file with template variables',
        script: `
          [ -f .env.example ] || cat > .env.example << EOF
          # Application Configuration
          NODE_ENV=development
          PORT=3000
          HOST=localhost

          # Database Configuration
          DB_HOST=localhost
          DB_PORT=5432
          DB_NAME=myapp
          DB_USER=postgres
          DB_PASSWORD=password

          # API Keys
          API_KEY=your-api-key-here
          SECRET_KEY=your-secret-key-here
          EOF
        `,
        validation: {
          type: 'file_exists',
          condition: '.env.example',
          errorMessage: 'Failed to create .env.example',
        },
      },
      {
        id: 'create-env',
        name: 'Create .env from Example',
        description: 'Copy .env.example to .env for local development',
        command: '[ -f .env ] || cp .env.example .env',
        dependencies: ['create-env-example'],
        validation: {
          type: 'file_exists',
          condition: '.env',
          errorMessage: 'Failed to create .env file',
        },
      },
      {
        id: 'validate-env',
        name: 'Validate Environment Variables',
        description: 'Check that required environment variables are set',
        script: `
          if [ -f .env ]; then
            source .env
            missing_vars=0
            for var in NODE_ENV PORT; do
              if [ -z "\${!var}" ]; then
                echo "Missing required variable: $var"
                missing_vars=1
              fi
            done
            exit $missing_vars
          fi
        `,
        dependencies: ['create-env'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Missing required environment variables',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['bash'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['environment', 'configuration', 'variables', 'setup'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
]
