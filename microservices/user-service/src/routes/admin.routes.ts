import { Router, Response } from 'express';
import { User } from '../models/user.model.js';
import { authenticateJwt, requireRole, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

// Helper function to sanitize user (remove password)
const sanitizeUser = (user: any) => {
  const userObj = user.toObject ? user.toObject() : user;
  const { passwordHash, __v, ...sanitized } = userObj;
  return {
    id: sanitized._id?.toString() || sanitized.id,
    ...sanitized,
    _id: undefined
  };
};

/**
 * @swagger
 * /admin/members:
 *   get:
 *     summary: Get all members with statistics
 *     description: Admin endpoint to get all members with membership statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of members with statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/members', authenticateJwt, requireRole('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const members = await User.find({ role: 'member' }).sort({ createdAt: -1 });
    
    // Calculate statistics
    const totalMembers = members.length;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const newMembersThisMonth = members.filter(m => new Date(m.createdAt) > thirtyDaysAgo).length;
    
    // Active members (those created within last 90 days as a proxy)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const activeMembers = members.filter(m => new Date(m.createdAt) > ninetyDaysAgo).length;
    
    res.json({
      members: members.map(sanitizeUser),
      statistics: {
        totalMembers,
        activeMembers,
        newMembersThisMonth,
        inactiveMembers: totalMembers - activeMembers
      }
    });
  } catch (error: any) {
    console.error('Get members error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /admin/members/{id}:
 *   get:
 *     summary: Get member details
 *     description: Admin endpoint to get detailed information about a specific member
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Member ID
 *     responses:
 *       200:
 *         description: Member details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Member not found
 */
router.get('/members/:id', authenticateJwt, requireRole('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const member = await User.findById(req.params.id);
    
    if (!member || member.role !== 'member') {
      res.status(404).json({ message: 'Member not found' });
      return;
    }
    
    res.json({
      ...sanitizeUser(member),
      // Add placeholder data for membership info - would come from subscription service
      membership: null,
      bookings: [],
      activityLog: []
    });
  } catch (error: any) {
    console.error('Get member details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /admin/trainers:
 *   get:
 *     summary: Get all trainers
 *     description: Admin endpoint to get all trainers
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of trainers
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/trainers', authenticateJwt, requireRole('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const trainers = await User.find({ role: 'trainer' }).sort({ createdAt: -1 });
    
    res.json({
      trainers: trainers.map(sanitizeUser),
      statistics: {
        totalTrainers: trainers.length
      }
    });
  } catch (error: any) {
    console.error('Get trainers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get admin dashboard stats
 *     description: Admin endpoint to get overview statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/dashboard', authenticateJwt, requireRole('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [totalMembers, totalTrainers, totalAdmins] = await Promise.all([
      User.countDocuments({ role: 'member' }),
      User.countDocuments({ role: 'trainer' }),
      User.countDocuments({ role: 'admin' })
    ]);
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const newMembersThisMonth = await User.countDocuments({ 
      role: 'member', 
      createdAt: { $gte: thirtyDaysAgo } 
    });
    
    res.json({
      users: {
        totalMembers,
        totalTrainers,
        totalAdmins,
        total: totalMembers + totalTrainers + totalAdmins
      },
      activity: {
        newMembersThisMonth
      }
    });
  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
