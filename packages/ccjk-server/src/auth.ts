import jwt from 'jsonwebtoken';
import { CONFIG } from './config';
import { prisma } from './db';
import type { User } from '@prisma/client';

/**
 * Authentication utilities
 */

export interface JWTPayload {
  userId: string;
  email: string;
}

/**
 * Generate JWT token
 */
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
  };

  return jwt.sign(payload, CONFIG.jwtSecret, {
    expiresIn: CONFIG.jwtExpiresIn,
  });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, CONFIG.jwtSecret) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

/**
 * Get user from token
 */
export async function getUserFromToken(token: string): Promise<User | null> {
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    return user;
  } catch {
    return null;
  }
}

/**
 * GitHub OAuth - Exchange code for access token
 */
export async function exchangeGitHubCode(code: string): Promise<string> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: CONFIG.github.clientId,
      client_secret: CONFIG.github.clientSecret,
      code,
    }),
  });

  const data = await response.json() as { access_token?: string; error?: string };

  if (data.error || !data.access_token) {
    throw new Error('Failed to exchange GitHub code');
  }

  return data.access_token;
}

/**
 * Get GitHub user info
 */
export async function getGitHubUser(accessToken: string): Promise<{
  id: number;
  login: string;
  email: string;
  name: string;
  avatar_url: string;
}> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get GitHub user');
  }

  return await response.json();
}

/**
 * Find or create user from GitHub
 */
export async function findOrCreateUserFromGitHub(githubUser: {
  id: number;
  login: string;
  email: string;
  name: string;
  avatar_url: string;
}, publicKey: string): Promise<User> {
  // Try to find existing user
  let user = await prisma.user.findUnique({
    where: { githubId: String(githubUser.id) },
  });

  if (user) {
    // Update user info
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        email: githubUser.email,
        name: githubUser.name,
        avatar: githubUser.avatar_url,
        githubUsername: githubUser.login,
        lastSeenAt: new Date(),
      },
    });
  } else {
    // Create new user
    user = await prisma.user.create({
      data: {
        email: githubUser.email,
        name: githubUser.name,
        avatar: githubUser.avatar_url,
        githubId: String(githubUser.id),
        githubUsername: githubUser.login,
        publicKey,
      },
    });
  }

  return user;
}
