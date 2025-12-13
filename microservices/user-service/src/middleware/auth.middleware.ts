import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/user.model.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

export interface JwtPayload {
  sub: string;      // User ID
  name: string;     // User's full name
  email: string;    // User's email
  role: string;     // User's role (admin, trainer, member)
  iat: number;      // Issued at timestamp
  exp: number;      // Expiration timestamp
}

export interface AuthRequest extends Request {
  user?: IUser;
  userId?: string;
}

export const authenticateJwt = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No token provided', code: 'NO_TOKEN' });
      return;
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const user = await User.findById(decoded.sub);

    if (!user) {
      res.status(401).json({ message: 'User not found', code: 'INVALID_TOKEN' });
      return;
    }

    req.user = user;
    req.userId = user._id.toString();

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Token has expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({ message: 'Invalid token', code: 'INVALID_TOKEN' });
      return;
    }
    res.status(401).json({ message: 'Token verification failed', code: 'INVALID_TOKEN' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden: insufficient permissions' });
      return;
    }

    next();
  };
};
