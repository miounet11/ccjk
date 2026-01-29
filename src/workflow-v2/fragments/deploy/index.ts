/**
 * Deployment Fragments
 *
 * Fragments for deployment and release tasks
 */

import type { Fragment } from '../../types.js'

export const deployFragments: Fragment[] = [
  {
    id: 'deploy-docker',
    name: 'Deploy with Docker',
    description: 'Build and deploy application using Docker containers',
    category: 'deploy',
    steps: [
      {
        id: 'build-image',
        name: 'Build Docker Image',
        description: 'Build the Docker image for the application',
        command: 'docker build -t ${IMAGE_NAME}:${VERSION} .',
        timeout: 600,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Docker image build failed',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'tag-image',
        name: 'Tag Docker Image',
        description: 'Tag the image for registry',
        command: 'docker tag ${IMAGE_NAME}:${VERSION} ${REGISTRY}/${IMAGE_NAME}:${VERSION}',
        dependencies: ['build-image'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to tag Docker image',
        },
        errorHandling: {
          strategy: 'abort',
          maxAttempts: 1,
        },
      },
      {
        id: 'push-image',
        name: 'Push to Registry',
        description: 'Push the image to Docker registry',
        command: 'docker push ${REGISTRY}/${IMAGE_NAME}:${VERSION}',
        dependencies: ['tag-image'],
        timeout: 900,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to push Docker image to registry',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 3,
        },
      },
      {
        id: 'deploy-container',
        name: 'Deploy Container',
        description: 'Deploy the container to production',
        command: 'docker-compose -f docker-compose.prod.yml up -d',
        dependencies: ['push-image'],
        timeout: 300,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Container deployment failed',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'health-check',
        name: 'Health Check',
        description: 'Verify deployment health',
        command: 'curl -f http://localhost/health || docker-compose logs',
        dependencies: ['deploy-container'],
        timeout: 60,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Health check failed - deployment may be unhealthy',
        },
        errorHandling: {
          strategy: 'abort',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['docker', 'docker-compose'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['deployment', 'docker', 'container', 'production'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'deploy-npm',
    name: 'Deploy to NPM',
    description: 'Publish package to NPM registry',
    category: 'deploy',
    steps: [
      {
        id: 'check-version',
        name: 'Check Version',
        description: 'Verify package version is not already published',
        command: 'npm view ${PACKAGE_NAME}@${PACKAGE_VERSION} || true',
        validation: {
          type: 'exit_code',
          condition: '1',
          errorMessage: 'This version is already published to NPM',
        },
        errorHandling: {
          strategy: 'abort',
          maxAttempts: 1,
        },
      },
      {
        id: 'build-package',
        name: 'Build Package',
        description: 'Build the package for distribution',
        command: 'npm run build',
        dependencies: ['check-version'],
        timeout: 300,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Package build failed',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'run-tests',
        name: 'Run Tests',
        description: 'Ensure all tests pass before publishing',
        command: 'npm test',
        dependencies: ['build-package'],
        timeout: 600,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Tests failed - cannot publish',
        },
        errorHandling: {
          strategy: 'abort',
          maxAttempts: 1,
        },
      },
      {
        id: 'publish-dry-run',
        name: 'Dry Run Publish',
        description: 'Test npm publish without actually publishing',
        command: 'npm pack --dry-run',
        dependencies: ['run-tests'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'NPM pack dry-run failed',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 1,
        },
      },
      {
        id: 'publish-package',
        name: 'Publish to NPM',
        description: 'Publish the package to NPM registry',
        command: 'npm publish',
        dependencies: ['publish-dry-run'],
        timeout: 300,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to publish to NPM',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'verify-publish',
        name: 'Verify Publish',
        description: 'Verify package was published successfully',
        command: 'npm view ${PACKAGE_NAME}@${PACKAGE_VERSION}',
        dependencies: ['publish-package'],
        timeout: 60,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Package not found in NPM registry after publish',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['node', 'npm'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['deployment', 'npm', 'publish', 'package', 'registry'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'deploy-gh-pages',
    name: 'Deploy to GitHub Pages',
    description: 'Deploy static site to GitHub Pages',
    category: 'deploy',
    steps: [
      {
        id: 'build-static',
        name: 'Build Static Site',
        description: 'Generate static files for deployment',
        command: 'npm run build:static',
        timeout: 300,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Static site build failed',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'check-build-output',
        name: 'Check Build Output',
        description: 'Verify static files were generated',
        command: '[ -d dist ] && [ "$(ls -A dist)" ]',
        dependencies: ['build-static'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'No static files found in dist directory',
        },
        errorHandling: {
          strategy: 'abort',
          maxAttempts: 1,
        },
      },
      {
        id: 'create-cname',
        name: 'Create CNAME File',
        description: 'Create CNAME file for custom domain if needed',
        script: `
          if [ -n "\${CUSTOM_DOMAIN}" ]; then
            echo "\${CUSTOM_DOMAIN}" > dist/CNAME
          fi
        `,
        dependencies: ['check-build-output'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to create CNAME file',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'deploy-pages',
        name: 'Deploy to GitHub Pages',
        description: 'Push static files to gh-pages branch',
        command: 'gh-pages -d dist',
        dependencies: ['create-cname'],
        timeout: 300,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to deploy to GitHub Pages',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'verify-deployment',
        name: 'Verify Deployment',
        description: 'Check that deployment was successful',
        command: 'curl -f https://${GITHUB_USERNAME}.github.io/${REPO_NAME}',
        dependencies: ['deploy-pages'],
        timeout: 120,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Deployment verification failed',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['node', 'npm', 'gh-pages', 'git'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['deployment', 'github-pages', 'static-site', 'hosting'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'deploy-vercel',
    name: 'Deploy to Vercel',
    description: 'Deploy application to Vercel platform',
    category: 'deploy',
    steps: [
      {
        id: 'install-vercel',
        name: 'Install Vercel CLI',
        description: 'Install the Vercel command line tool',
        command: 'npm install -g vercel',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to install Vercel CLI',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'build-for-vercel',
        name: 'Build for Vercel',
        description: 'Build the project optimized for Vercel',
        command: 'npm run build',
        dependencies: ['install-vercel'],
        timeout: 300,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Build failed for Vercel deployment',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'deploy-vercel',
        name: 'Deploy to Vercel',
        description: 'Deploy the application to Vercel',
        command: 'vercel --prod --yes',
        dependencies: ['build-for-vercel'],
        timeout: 600,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Vercel deployment failed',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'verify-vercel-deploy',
        name: 'Verify Vercel Deployment',
        description: 'Check that deployment was successful',
        command: 'vercel inspect ${PROJECT_NAME}',
        dependencies: ['deploy-vercel'],
        timeout: 120,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Vercel deployment verification failed',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['node', 'npm', 'vercel'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['deployment', 'vercel', 'serverless', 'hosting'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'deploy-heroku',
    name: 'Deploy to Heroku',
    description: 'Deploy application to Heroku platform',
    category: 'deploy',
    steps: [
      {
        id: 'check-heroku-cli',
        name: 'Check Heroku CLI',
        description: 'Verify Heroku CLI is installed and authenticated',
        command: 'heroku --version',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Heroku CLI is not installed',
        },
        errorHandling: {
          strategy: 'abort',
          maxAttempts: 1,
        },
      },
      {
        id: 'create-heroku-app',
        name: 'Create Heroku App',
        description: 'Create a new Heroku app if it does not exist',
        command: 'heroku apps | grep -q "${HEROKU_APP_NAME}" || heroku create ${HEROKU_APP_NAME}',
        dependencies: ['check-heroku-cli'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to create Heroku app',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'setup-buildpack',
        name: 'Setup Buildpack',
        description: 'Configure the appropriate buildpack',
        command: 'heroku buildpacks:set heroku/nodejs',
        dependencies: ['create-heroku-app'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to set buildpack',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'configure-env-vars',
        name: 'Configure Environment Variables',
        description: 'Set environment variables for Heroku deployment',
        script: `
          heroku config:set NODE_ENV=production
          heroku config:set NPM_CONFIG_PRODUCTION=true
        `,
        dependencies: ['setup-buildpack'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to configure environment variables',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'deploy-to-heroku',
        name: 'Deploy to Heroku',
        description: 'Push code to Heroku for deployment',
        command: 'git push heroku main',
        dependencies: ['configure-env-vars'],
        timeout: 600,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Heroku deployment failed',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'scale-dynos',
        name: 'Scale Dynos',
        description: 'Scale the application to appropriate dyno size',
        command: 'heroku ps:scale web=1',
        dependencies: ['deploy-to-heroku'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to scale dynos',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'verify-heroku-deploy',
        name: 'Verify Heroku Deployment',
        description: 'Check that deployment was successful',
        command: 'heroku ps',
        dependencies: ['scale-dynos'],
        timeout: 60,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Heroku deployment verification failed',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['git', 'heroku'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['deployment', 'heroku', 'paas', 'hosting'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'deploy-aws',
    name: 'Deploy to AWS',
    description: 'Deploy application to AWS services',
    category: 'deploy',
    steps: [
      {
        id: 'check-aws-cli',
        name: 'Check AWS CLI',
        description: 'Verify AWS CLI is installed and configured',
        command: 'aws --version',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'AWS CLI is not installed',
        },
        errorHandling: {
          strategy: 'abort',
          maxAttempts: 1,
        },
      },
      {
        id: 'build-package',
        name: 'Build Deployment Package',
        description: 'Create deployment package for AWS',
        command: 'npm run build:aws',
        dependencies: ['check-aws-cli'],
        timeout: 300,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'AWS deployment package build failed',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'upload-to-s3',
        name: 'Upload to S3',
        description: 'Upload deployment package to S3 bucket',
        command: 'aws s3 cp dist.zip s3://${S3_BUCKET}/dist-${VERSION}.zip',
        dependencies: ['build-package'],
        timeout: 300,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to upload to S3',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 3,
        },
      },
      {
        id: 'deploy-lambda',
        name: 'Deploy Lambda Function',
        description: 'Update Lambda function with new code',
        command: 'aws lambda update-function-code --function-name ${FUNCTION_NAME} --s3-bucket ${S3_BUCKET} --s3-key dist-${VERSION}.zip',
        dependencies: ['upload-to-s3'],
        timeout: 180,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Lambda deployment failed',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'update-api-gateway',
        name: 'Update API Gateway',
        description: 'Update API Gateway if configuration changed',
        command: 'aws apigateway create-deployment --rest-api-id ${API_ID} --stage-name ${STAGE}',
        dependencies: ['deploy-lambda'],
        timeout: 120,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'API Gateway deployment failed',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'invalidate-cdn',
        name: 'Invalidate CloudFront CDN',
        description: 'Invalidate CloudFront cache for static assets',
        command: 'aws cloudfront create-invalidation --distribution-id ${DISTRIBUTION_ID} --paths "/*"',
        dependencies: ['update-api-gateway'],
        timeout: 60,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'CDN invalidation failed',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'verify-aws-deploy',
        name: 'Verify AWS Deployment',
        description: 'Check that AWS deployment was successful',
        command: 'aws lambda get-function --function-name ${FUNCTION_NAME}',
        dependencies: ['invalidate-cdn'],
        timeout: 60,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'AWS deployment verification failed',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['aws-cli', 'node', 'npm'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['deployment', 'aws', 'lambda', 's3', 'cloudfront'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'deploy-release',
    name: 'Create Release',
    description: 'Create and publish a new release',
    category: 'deploy',
    steps: [
      {
        id: 'validate-release',
        name: 'Validate Release',
        description: 'Check that release is ready (tests pass, version updated)',
        script: `
          # Check if version is updated
          current_version=$(node -p "require('./package.json').version")
          git tag -l | grep -q "v$current_version" && {
            echo "Version $current_version already released"
            exit 1
          }

          # Run tests
          npm test
        `,
        timeout: 600,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Release validation failed',
        },
        errorHandling: {
          strategy: 'abort',
          maxAttempts: 1,
        },
      },
      {
        id: 'generate-changelog',
        name: 'Generate Changelog',
        description: 'Generate changelog from git commits',
        command: 'npx conventional-changelog -p angular -i CHANGELOG.md -s',
        dependencies: ['validate-release'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to generate changelog',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'commit-changes',
        name: 'Commit Release Changes',
        description: 'Commit changelog and any version updates',
        command: 'git add CHANGELOG.md && git commit -m "chore: update changelog for release"',
        dependencies: ['generate-changelog'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to commit release changes',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 1,
        },
      },
      {
        id: 'create-git-tag',
        name: 'Create Git Tag',
        description: 'Create a git tag for the release',
        command: 'git tag -a v${VERSION} -m "Release version ${VERSION}"',
        dependencies: ['commit-changes'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to create git tag',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 1,
        },
      },
      {
        id: 'push-release',
        name: 'Push Release',
        description: 'Push commits and tags to remote repository',
        command: 'git push origin main --tags',
        dependencies: ['create-git-tag'],
        timeout: 120,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to push release to remote',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'create-github-release',
        name: 'Create GitHub Release',
        description: 'Create a GitHub release with changelog',
        command: 'gh release create v${VERSION} --title "Release v${VERSION}" --notes-file CHANGELOG.md',
        dependencies: ['push-release'],
        timeout: 120,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to create GitHub release',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'notify-release',
        name: 'Notify Release',
        description: 'Send notifications about the new release',
        script: `
          echo "Release v\${VERSION} has been published!"
          echo "GitHub Release: https://github.com/\${GITHUB_REPO}/releases/tag/v\${VERSION}"
        `,
        dependencies: ['create-github-release'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to send release notification',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['git', 'node', 'npm', 'gh'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['deployment', 'release', 'git', 'github', 'changelog'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'deploy-blue-green',
    name: 'Blue-Green Deployment',
    description: 'Perform zero-downtime deployment using blue-green strategy',
    category: 'deploy',
    steps: [
      {
        id: 'build-blue',
        name: 'Build Blue Environment',
        description: 'Build new version for blue environment',
        command: 'docker build -t ${APP_NAME}:blue-${VERSION} .',
        timeout: 600,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Blue environment build failed',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'deploy-blue',
        name: 'Deploy Blue Environment',
        description: 'Deploy blue environment but do not route traffic yet',
        command: 'docker run -d --name ${APP_NAME}-blue -p 8081:3000 ${APP_NAME}:blue-${VERSION}',
        dependencies: ['build-blue'],
        timeout: 300,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Blue environment deployment failed',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'test-blue',
        name: 'Test Blue Environment',
        description: 'Run health checks on blue environment',
        command: 'timeout 60 bash -c "until curl -f http://localhost:8081/health; do sleep 2; done"',
        dependencies: ['deploy-blue'],
        timeout: 90,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Blue environment health check failed',
        },
        errorHandling: {
          strategy: 'abort',
          maxAttempts: 1,
        },
      },
      {
        id: 'switch-traffic',
        name: 'Switch Traffic to Blue',
        description: 'Route all traffic to blue environment',
        command: 'docker exec nginx nginx -s reload',
        dependencies: ['test-blue'],
        timeout: 30,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to switch traffic to blue environment',
        },
        errorHandling: {
          strategy: 'abort',
          maxAttempts: 1,
        },
      },
      {
        id: 'monitor-blue',
        name: 'Monitor Blue Environment',
        description: 'Monitor blue environment for issues',
        command: 'timeout 300 bash -c "while true; do curl -f http://localhost:8081/health || exit 1; sleep 10; done"',
        dependencies: ['switch-traffic'],
        timeout: 330,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Blue environment monitoring detected issues',
        },
        errorHandling: {
          strategy: 'abort',
          maxAttempts: 1,
        },
      },
      {
        id: 'stop-green',
        name: 'Stop Green Environment',
        description: 'Stop the old green environment',
        command: 'docker stop ${APP_NAME}-green || true',
        dependencies: ['monitor-blue'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to stop green environment',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'rename-environments',
        name: 'Rename Environments',
        description: 'Rename blue to green for next deployment',
        command: 'docker rename ${APP_NAME}-blue ${APP_NAME}-green',
        dependencies: ['stop-green'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to rename environments',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['docker', 'nginx'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['deployment', 'blue-green', 'zero-downtime', 'production'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'deploy-rollback',
    name: 'Rollback Deployment',
    description: 'Rollback to previous deployment version',
    category: 'deploy',
    steps: [
      {
        id: 'identify-previous',
        name: 'Identify Previous Version',
        description: 'Find the previous deployment version',
        command: 'docker images ${APP_NAME} --format "table {{.Tag}}" | grep -v "latest" | sort -r | head -2 | tail -1',
        timeout: 60,
        validation: {
          type: 'output',
          condition: 'v[0-9]+\\.[0-9]+\\.[0-9]+',
          errorMessage: 'Could not identify previous version',
        },
        errorHandling: {
          strategy: 'abort',
          maxAttempts: 1,
        },
      },
      {
        id: 'stop-current',
        name: 'Stop Current Version',
        description: 'Stop the current deployment',
        command: 'docker stop ${APP_NAME} || true',
        dependencies: ['identify-previous'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to stop current version',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'start-previous',
        name: 'Start Previous Version',
        description: 'Start the previous version',
        command: 'docker run -d --name ${APP_NAME} -p 3000:3000 ${APP_NAME}:${PREVIOUS_VERSION}',
        dependencies: ['stop-current'],
        timeout: 300,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to start previous version',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'verify-rollback',
        name: 'Verify Rollback',
        description: 'Verify the rollback was successful',
        command: 'timeout 60 bash -c "until curl -f http://localhost:3000/health; do sleep 2; done"',
        dependencies: ['start-previous'],
        timeout: 90,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Rollback verification failed',
        },
        errorHandling: {
          strategy: 'abort',
          maxAttempts: 1,
        },
      },
      {
        id: 'notify-rollback',
        name: 'Notify Rollback',
        description: 'Send notification about the rollback',
        script: `
          echo "Rollback completed successfully"
          echo "Application rolled back to version \${PREVIOUS_VERSION}"
        `,
        dependencies: ['verify-rollback'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to send rollback notification',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['docker'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['deployment', 'rollback', 'recovery', 'production'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
]