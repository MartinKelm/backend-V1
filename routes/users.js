const express = require('express');
const { getPrisma } = require('../lib/database');
const { hashPassword, validatePassword } = require('../lib/password');
const { authenticateToken, requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const { validateRequest, adminSchema } = require('../lib/validation');
const { logAuditEvent, AUDIT_EVENTS } = require('../lib/audit');

const router = express.Router();

// Get all users (Admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { page = 1, limit = 20, search, role, isActive } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          company: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    await logAuditEvent(req.user.id, 'USERS_LISTED', {
      filters: { search, role, isActive },
      resultCount: users.length
    }, req.ip, req.get('User-Agent'));

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users.'
    });
  }
});

// Get user by ID (Admin only)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    await logAuditEvent(req.user.id, 'USER_VIEWED', {
      targetUserId: id,
      targetUserEmail: user.email
    }, req.ip, req.get('User-Agent'));

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user.'
    });
  }
});

// Create admin user (Super Admin only)
router.post('/admin', authenticateToken, requireSuperAdmin, validateRequest(adminSchema), async (req, res) => {
  try {
    const { firstName, lastName, email, password, role = 'ADMIN' } = req.body;
    const prisma = getPrisma();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.'
      });
    }

    // Validate password strength
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordErrors
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
        company: 'SMK Administration'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        role: true,
        createdAt: true
      }
    });

    await logAuditEvent(req.user.id, AUDIT_EVENTS.ADMIN_CREATED, {
      newAdminId: adminUser.id,
      newAdminEmail: adminUser.email,
      newAdminRole: adminUser.role,
      createdBy: req.user.email
    }, req.ip, req.get('User-Agent'));

    console.log(`✅ New admin created: ${adminUser.email} with role ${adminUser.role}`);

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: { user: adminUser }
    });

  } catch (error) {
    console.error('❌ Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin user.'
    });
  }
});

// Update user role (Super Admin only)
router.put('/:id/role', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const prisma = getPrisma();

    if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be USER, ADMIN, or SUPER_ADMIN.'
      });
    }

    // Get current user data
    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true }
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Prevent changing own role
    if (currentUser.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role.'
      });
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        role: true,
        updatedAt: true
      }
    });

    await logAuditEvent(req.user.id, AUDIT_EVENTS.ROLE_CHANGED, {
      targetUserId: id,
      targetUserEmail: updatedUser.email,
      oldRole: currentUser.role,
      newRole: role,
      changedBy: req.user.email
    }, req.ip, req.get('User-Agent'));

    console.log(`✅ User role updated: ${updatedUser.email} from ${currentUser.role} to ${role}`);

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('❌ Update role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role.'
    });
  }
});

// Activate/Deactivate user (Admin only)
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const prisma = getPrisma();

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value.'
      });
    }

    // Get current user data
    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, isActive: true, role: true }
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Prevent deactivating own account
    if (currentUser.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account.'
      });
    }

    // Prevent non-super-admins from deactivating admins
    if (currentUser.role === 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only Super Admins can deactivate Admin accounts.'
      });
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    const action = isActive ? AUDIT_EVENTS.USER_ACTIVATED : AUDIT_EVENTS.USER_DEACTIVATED;
    await logAuditEvent(req.user.id, action, {
      targetUserId: id,
      targetUserEmail: updatedUser.email,
      newStatus: isActive,
      changedBy: req.user.email
    }, req.ip, req.get('User-Agent'));

    console.log(`✅ User ${isActive ? 'activated' : 'deactivated'}: ${updatedUser.email}`);

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('❌ Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status.'
    });
  }
});

// Delete user (Super Admin only)
router.delete('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = getPrisma();

    // Get current user data
    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true }
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Prevent deleting own account
    if (currentUser.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.'
      });
    }

    // Delete user (this will also delete related audit logs due to cascade)
    await prisma.user.delete({
      where: { id }
    });

    await logAuditEvent(req.user.id, 'USER_DELETED', {
      deletedUserId: id,
      deletedUserEmail: currentUser.email,
      deletedUserRole: currentUser.role,
      deletedBy: req.user.email
    }, req.ip, req.get('User-Agent'));

    console.log(`✅ User deleted: ${currentUser.email}`);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user.'
    });
  }
});

// Get user statistics (Admin only)
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const prisma = getPrisma();

    const [
      totalUsers,
      activeUsers,
      adminUsers,
      recentRegistrations
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      })
    ]);

    const stats = {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      adminUsers,
      regularUsers: totalUsers - adminUsers,
      recentRegistrations
    };

    await logAuditEvent(req.user.id, 'STATS_VIEWED', {
      statsType: 'user_overview'
    }, req.ip, req.get('User-Agent'));

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user statistics.'
    });
  }
});

module.exports = router;
