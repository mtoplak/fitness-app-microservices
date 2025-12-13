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

// Helper function to generate JWT with required claims: sub, name, iat, exp
const generateToken = (userId: string, email: string, role: string, name: string): string => {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,       // Subject (user ID)
    name: name,        // User's full name
    email: email,      // User's email
    role: role,        // User's role
    iat: now,          // Issued at (automatically added by jwt.sign, but explicit for clarity)
  };
  // expiresIn adds 'exp' claim automatically
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

// Helper function to sanitize user (remove password)
const sanitizeUser = (user: any) => {
  const userObj = user.toObject ? user.toObject() : user;
  const { passwordHash, __v, ...sanitized } = userObj;
  return sanitized;
};

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       409:
 *         description: User with this email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

    // Generate token with name claim
    const token = generateToken(user._id.toString(), user.email, user.role, user.fullName);

    res.status(201).json({
      user: sanitizeUser(user),
      token,
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Successfully logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *       400:
 *         description: Validation error
 */
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

    // Generate token with name claim
    const token = generateToken(user._id.toString(), user.email, user.role, user.fullName);

    res.json({
      user: sanitizeUser(user),
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /users/me:
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *     responses:
 *       200:
 *         description: User profile updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
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

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve a specific user by their ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
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

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a list of all users (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
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

/**
 * @swagger
 * /users/role/{role}:
 *   get:
 *     summary: Get users by role
 *     description: Retrieve all users with a specific role (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [member, trainer, admin]
 *         description: User role
 *     responses:
 *       200:
 *         description: List of users with specified role
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid role
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
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

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user by ID
 *     description: Update a specific user's information (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               address:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [member, trainer, admin]
 *               membershipId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 */
/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user by ID
 *     description: Update a specific user's information (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               address:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [member, trainer, admin]
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 */
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

/**
 * @swagger
 * /users/me:
 *   delete:
 *     summary: Delete current user account
 *     description: Delete the authenticated user's own account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Account deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
/**
 * @swagger
 * /users/me:
 *   delete:
 *     summary: Delete own account
 *     description: Delete the authenticated user's account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Account deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
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

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete user by ID
 *     description: Delete a specific user by their ID (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User deleted successfully
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 */
/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete user by ID
 *     description: Delete a specific user by their ID (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User deleted successfully
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 */
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

/**
 * @swagger
 * /users/verify-token:
 *   post:
 *     summary: Verify JWT token
 *     description: Verify a JWT token and return the decoded payload. Used by other microservices for token validation.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: JWT token to verify
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 payload:
 *                   type: object
 *                   properties:
 *                     sub:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     iat:
 *                       type: number
 *                     exp:
 *                       type: number
 *       401:
 *         description: Invalid or expired token
 */
router.post('/verify-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ valid: false, message: 'Token is required' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      name: string;
      email: string;
      role: string;
      iat: number;
      exp: number;
    };

    res.json({
      valid: true,
      payload: decoded,
    });
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ valid: false, message: 'Token has expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({ valid: false, message: 'Invalid token', code: 'INVALID_TOKEN' });
      return;
    }
    res.status(401).json({ valid: false, message: 'Token verification failed' });
  }
});

export default router;
