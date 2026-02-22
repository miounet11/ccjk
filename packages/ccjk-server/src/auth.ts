import type { User } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { CONFIG } from './config';
import { prisma } from './db';

/**
 * Authentication utilities
 */

export interface JWTPayload {
  userId: string;
  email: string;
}

const LOCAL_AUTH_PREFIX = 'pwd:';

/**
 * Generate JWT token
 */
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
  };

  return jwt.sign(payload, CONFIG.jwtSecret, {
    expiresIn: CONFIG.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Create local auth credential payload
 */
export function createLocalAuthCredential(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `${LOCAL_AUTH_PREFIX}scrypt$${salt}$${derivedKey}`;
}

/**
 * Check if stored credential is local email/password auth
 */
export function isLocalAuthCredential(credential: string): boolean {
  return credential.startsWith(`${LOCAL_AUTH_PREFIX}scrypt$`);
}

/**
 * Verify local auth credential payload
 */
export function verifyLocalAuthCredential(credential: string, password: string): boolean {
  if (!isLocalAuthCredential(credential)) {
    return false;
  }

  const raw = credential.slice(LOCAL_AUTH_PREFIX.length);
  const parts = raw.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }

  const salt = parts[1];
  const expectedHex = parts[2];
  const derivedHex = scryptSync(password, salt, 64).toString('hex');

  const expected = Buffer.from(expectedHex, 'hex');
  const derived = Buffer.from(derivedHex, 'hex');

  if (expected.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(expected, derived);
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

  return await response.json() as {
    id: number;
    login: string;
    email: string;
    name: string;
    avatar_url: string;
  };
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
