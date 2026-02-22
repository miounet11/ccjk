import type { FastifyInstance } from 'fastify';
import {
    createLocalAuthCredential,
    exchangeGitHubCode,
    findOrCreateUserFromGitHub,
    generateToken,
    getGitHubUser,
    isLocalAuthCredential,
    verifyLocalAuthCredential,
} from '../auth';
import { CONFIG } from '../config';
import { prisma } from '../db';
import { sendMappedError } from '../http-errors';

/**
 * Authentication routes
 */

export async function authRoutes(fastify: FastifyInstance) {
  // Email register
  fastify.post<{
    Body: { email: string; password: string; name?: string };
  }>('/auth/register', async (request, reply) => {
    const email = request.body.email?.trim().toLowerCase();
    const password = request.body.password;
    const name = request.body.name?.trim() || null;

    if (!email || !password) {
      return sendMappedError(reply, 400, 'Missing email or password');
    }

    if (password.length < 6) {
      return sendMappedError(reply, 400, 'Password must be at least 6 characters');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return sendMappedError(reply, 409, 'Email already registered');
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        githubId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        publicKey: createLocalAuthCredential(password),
      },
    });

    const token = generateToken(user);

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    });
  });

  // Email login
  fastify.post<{
    Body: { email: string; password: string };
  }>('/auth/login', async (request, reply) => {
    const email = request.body.email?.trim().toLowerCase();
    const password = request.body.password;

    if (!email || !password) {
      return sendMappedError(reply, 400, 'Missing email or password');
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !isLocalAuthCredential(user.publicKey) || !verifyLocalAuthCredential(user.publicKey, password)) {
      return sendMappedError(reply, 401, 'Invalid email or password');
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
    });

    const token = generateToken(updatedUser);

    return reply.send({
      token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
      },
    });
  });

  // GitHub OAuth - Start
  fastify.get('/auth/github', async (request, reply) => {
    const redirectUri = `https://github.com/login/oauth/authorize?client_id=${CONFIG.github.clientId}&redirect_uri=${CONFIG.github.callbackUrl}&scope=user:email`;
    return reply.redirect(redirectUri);
  });

  // GitHub OAuth - Callback
  fastify.get<{
    Querystring: { code?: string; error?: string; publicKey?: string };
  }>('/auth/github/callback', async (request, reply) => {
    const { code, error, publicKey } = request.query;

    if (error || !code) {
      return sendMappedError(reply, 400, 'GitHub OAuth failed');
    }

    if (!publicKey || !publicKey.trim()) {
      return sendMappedError(reply, 400, 'Missing publicKey');
    }

    try {
      // Exchange code for access token
      const accessToken = await exchangeGitHubCode(code);

      // Get GitHub user
      const githubUser = await getGitHubUser(accessToken);

      // Find or create user
      const user = await findOrCreateUserFromGitHub(githubUser, publicKey.trim());

      // Generate JWT
      const token = generateToken(user);

      // Return token
      return reply.send({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      console.error('GitHub OAuth error:', error);
      return sendMappedError(reply, 500, 'Authentication failed');
    }
  });

  // Mobile OAuth - Direct token exchange
  fastify.post<{
    Body: { code: string; publicKey: string };
  }>('/auth/mobile', async (request, reply) => {
    const { code, publicKey } = request.body;

    if (!code || !publicKey) {
      return sendMappedError(reply, 400, 'Missing code or publicKey');
    }

    try {
      // Exchange code for access token
      const accessToken = await exchangeGitHubCode(code);

      // Get GitHub user
      const githubUser = await getGitHubUser(accessToken);

      // Find or create user
      const user = await findOrCreateUserFromGitHub(githubUser, publicKey);

      // Generate JWT
      const token = generateToken(user);

      return reply.send({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      console.error('Mobile auth error:', error);
      return sendMappedError(reply, 500, 'Authentication failed');
    }
  });

  // Verify token
  fastify.get('/auth/verify', async (request, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return sendMappedError(reply, 401, 'No token provided');
    }

    try {
      const { getUserFromToken } = await import('../auth');
      const user = await getUserFromToken(token);

      if (!user) {
        return sendMappedError(reply, 401, 'Invalid token');
      }

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      return sendMappedError(reply, 401, 'Invalid token');
    }
  });
}
