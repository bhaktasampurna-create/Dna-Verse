import { NextFunction, Request, Response } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { eq } from 'drizzle-orm';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';

export interface AuthUserRecord {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  institution: string;
  researchInterest: string;
  role: string;
  status: string;
  emailVerified: boolean;
}

export interface AuthRequest extends Request {
  firebaseUser?: DecodedIdToken;
  appUser?: AuthUserRecord;
}

function isConfiguredAdminEmail(email?: string): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS || '';
  const list = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Authentication token is empty.' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.firebaseUser = decoded;

    const email = decoded.email || `${decoded.uid}@ecotrace.local`;
    const isAdminClaim = decoded.admin === true || isConfiguredAdminEmail(email);

    const existing = await db.select().from(users).where(eq(users.uid, decoded.uid)).limit(1);

    let userRecord: AuthUserRecord;
    if (existing.length === 0) {
      const inserted = await db
        .insert(users)
        .values({
          uid: decoded.uid,
          email,
          fullName: decoded.name || email.split('@')[0] || 'Researcher',
          role: isAdminClaim ? 'admin' : 'user',
          status: 'active',
          emailVerified: Boolean(decoded.email_verified),
          lastLoginAt: new Date(),
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email,
            emailVerified: Boolean(decoded.email_verified),
            lastLoginAt: new Date(),
          },
        })
        .returning();
      userRecord = inserted[0];
    } else {
      const current = existing[0];
      const nextRole = isAdminClaim ? 'admin' : current.role;
      const updated = await db
        .update(users)
        .set({
          email,
          role: nextRole,
          emailVerified: Boolean(decoded.email_verified),
          lastLoginAt: new Date(),
        })
        .where(eq(users.uid, decoded.uid))
        .returning();
      userRecord = updated[0];
    }

    if (userRecord.status === 'disabled') {
      return res.status(403).json({
        error: 'This account has been disabled by an administrator.',
      });
    }

    req.appUser = userRecord;
    next();
  } catch (err) {
    console.error('Firebase token verification error:', err);
    return res.status(401).json({ error: 'Invalid or expired authentication session.' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.appUser) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.appUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Administrator privileges are required for this operation.',
    });
  }
  next();
};
