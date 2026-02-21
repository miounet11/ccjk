import type { FastifyInstance } from 'fastify';
import { exchangeGitHubCode, getGitHubUser, findOrCreateUserFromGitHub, generateToken } from '../auth';
import { CONFIG } from '../config';

/**
 * Authentication routes
 */

export async function authRoutes(fastify: FastifyInstance) {
  // GitHub OAuth - Start
  fastify.get('/auth/github', async (request, reply) => {
    const redirectUri = `https://github.com/login/oauth/authorize?client_id=${CONFIG.github.clientId}&redirect_uri=${CONFIG.github.callbackUrl}&scope=user:email`;
    return reply.redirect(redirectUri);
  });

  // GitHub OAuth - Callback
  fastify.get<{
    Querystring: { code?: string; error?: string };
  }>('/auth/github/callback', async (request, reply) => {
    const { code, error } = request.query;

    if (error || !code) {
      return reply.status(400).send({ error: 'GitHub OAuth failed' });
    }

    try {
      // Exchange code for access token
      const accessToken = await exchangeGitHubCode(code);

      // Get GitHub user
      const githubUser = await getGitHubUser(accessToken);

      // TODO: Get public key from request (should be sent by client)
      const publicKey = 'placeholder-public-key';

      // Find or create user
      const user = await findOrCreateUserFromGitHub(githubUser, publicKey);

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
      return reply.status(500).send({ error: 'Authentication failed' });
    }
  });

  // Mobile OAuth - Direct token exchange
  fastify.post<{
    Body: { code: string; publicKey: string };
  }>('/auth/mobile', async (request, reply) => {
    const { code, publicKey } = request.body;

    if (!code || !publicKey) {
      return reply.status(400).send({ error: 'Missing code or publicKey' });
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
      return reply.status(500).send({ error: 'Authentication failed' });
    }
  });

  // Verify token
  fastify.get('/auth/verify', async (request, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return reply.status(401).send({ error: 'No token provided' });
    }

    try {
      const { getUserFromToken } = await import('../auth');
      const user = await getUserFromToken(token);

      if (!user) {
        return reply.status(401).send({ error: 'Invalid token' });
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
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });
}
