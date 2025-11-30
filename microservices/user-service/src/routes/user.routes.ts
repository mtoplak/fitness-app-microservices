import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { User } from '../models/user.model.js';
import { authenticateJwt, requireRole, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('fullName').notEmpty().trim(),
  body('firstName').optional().trim(),
  body('lastName').optional().trim(),
  body('address').optional().trim(),
  body('role').optional().isIn(['admin', 'trainer', 'member']),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

const updateValidation = [
  body('fullName').optional().trim(),
  body('firstName').optional().trim(),
  body('lastName').optional().trim(),
  body('address').optional().trim(),
  body('membershipId').optional().trim(),
];

// Helper function to generate JWT
const generateToken = (userId: string, email: string, role: string): string => {
  return jwt.sign({ sub: userId, email, role }, JWT_SECRET, { expiresIn: '7d' });
};

// Helper function to sanitize user (remove password)
const sanitizeUser = (user: any) => {
  const userObj = user.toObject ? user.toObject() : user;
  const { passwordHash, __v, ...sanitized } = userObj;
  return sanitized;
};

// POST /users/register - Register new user
router.post('/register', registerValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Validation error', errors: errors.array() });
      return;
    }

    const { email, password, fullName, firstName, lastName, address, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ message: 'User with this email already exists' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      passwordHash,
      fullName,
      firstName,
      lastName,
      address,
      role: role || 'member',
    });

    // Generate token
    const token = generateToken(user._id.toString(), user.email, user.role);

    res.status(201).json({
      user: sanitizeUser(user),
      token,
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /users/login - Login user
router.post('/login', loginValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Validation error', errors: errors.array() });
      return;
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Generate token
    const token = generateToken(user._id.toString(), user.email, user.role);

    res.json({
      user: sanitizeUser(user),
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /users/me - Get current user profile
router.get('/me', authenticateJwt, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    res.json(sanitizeUser(req.user));
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /users/me - Update current user profile
router.put('/me', authenticateJwt, updateValidation, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Validation error', errors: errors.array() });
      return;
    }

    if (!req.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const updates = req.body;
    const user = await User.findByIdAndUpdate(req.userId, { $set: updates }, { new: true });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(sanitizeUser(user));
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /users/:id/exists - Check if user exists (public/internal)
router.get('/:id/exists', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.exists({ _id: req.params.id });
    if (!user) {
      res.status(404).json({ exists: false });
      return;
    }
    res.json({ exists: true });
  } catch (error: any) {
    console.error('Check user exists error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /users/:id - Get user by ID (protected)
router.get('/:id', authenticateJwt, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(sanitizeUser(user));
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /users - Get all users (admin only)
router.get('/', authenticateJwt, requireRole('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find();
    res.json(users.map(sanitizeUser));
  } catch (error: any) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /users/role/:role - Get users by role (admin only)
router.get('/role/:role', authenticateJwt, requireRole('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role } = req.params;

    if (!['admin', 'trainer', 'member'].includes(role)) {
      res.status(400).json({ message: 'Invalid role' });
      return;
    }

    const users = await User.find({ role });
    res.json(users.map(sanitizeUser));
  } catch (error: any) {
    console.error('Get users by role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /users/:id - Update user by ID (admin only)
router.put('/:id', authenticateJwt, requireRole('admin'), updateValidation, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Validation error', errors: errors.array() });
      return;
    }

    const updates = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(sanitizeUser(user));
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /users/me - Delete own account
router.delete('/me', authenticateJwt, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await User.findByIdAndDelete(req.userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error: any) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /users/:id - Delete user by ID (admin only)
router.delete('/:id', authenticateJwt, requireRole('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ message: 'User deleted successfully', user: sanitizeUser(user) });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
