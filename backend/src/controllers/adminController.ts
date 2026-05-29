import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const getAnalytics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalBookings,
      pendingBookings,
      approvedBookings,
      cancelledBookings,
      totalFacilities,
      totalUsers,
      recentBookings,
      facilityUsage,
      bookingsByStatus,
      dailyTrend,
    ] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'PENDING' } }),
      prisma.booking.count({ where: { status: 'APPROVED' } }),
      prisma.booking.count({ where: { status: 'CANCELLED' } }),
      prisma.facility.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.booking.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        include: {
          facility: { select: { name: true } },
          user: { select: { name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.booking.groupBy({
        by: ['facilityId'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      prisma.booking.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.booking.groupBy({
        by: ['createdAt'],
        where: { createdAt: { gte: sevenDaysAgo } },
        _count: { id: true },
      }),
    ]);

    // Get facility names for usage
    const facilityIds = facilityUsage.map((f: any) => f.facilityId);
    const facilities = await prisma.facility.findMany({
      where: { id: { in: facilityIds } },
      select: { id: true, name: true, type: true },
    });

    const topFacilities = facilityUsage.map((f: any) => ({
      ...f,
      facility: facilities.find((fac: any) => fac.id === f.facilityId),
    }));

    // Peak hours analysis
    const allBookings = await prisma.booking.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, status: 'APPROVED' },
      select: { startTime: true },
    });

    const hourCounts: Record<string, number> = {};
    allBookings.forEach((b: any) => {
      const hour = b.startTime.split(':')[0];
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    res.json({
      overview: {
        totalBookings,
        pendingBookings,
        approvedBookings,
        cancelledBookings,
        totalFacilities,
        totalUsers,
        cancellationRate: totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(1) : 0,
        approvalRate: totalBookings > 0 ? ((approvedBookings / totalBookings) * 100).toFixed(1) : 0,
      },
      recentBookings,
      topFacilities,
      bookingsByStatus,
      peakHours,
      dailyTrend,
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingApprovals = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { status: 'PENDING', approvalRequired: true },
      include: {
        facility: { select: { id: true, name: true, location: true, type: true } },
        user: { select: { id: true, name: true, email: true, role: true, department: true } },
        approval: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ bookings });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role, search } = req.query;
    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { email: { contains: search as string } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true,
        department: true, isActive: true, createdAt: true,
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { role, isActive } = req.body;

    // Super admin only for role changes
    if (role && req.user!.role !== 'SUPER_ADMIN') {
      throw new AppError('Only super admins can change user roles', 403);
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role, isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    res.json({ message: 'User updated', user });
  } catch (error) {
    next(error);
  }
};

export const createMaintenanceBlock = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { facilityId, blockedDate, startTime, endTime, reason } = req.body;

    const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
    if (!facility) throw new AppError('Facility not found', 404);

    const block = await prisma.maintenanceBlock.create({
      data: {
        facilityId,
        blockedDate: new Date(blockedDate),
        startTime,
        endTime,
        reason,
      },
      include: { facility: { select: { name: true } } },
    });

    res.status(201).json({ message: 'Maintenance block created', block });
  } catch (error) {
    next(error);
  }
};

export const getMaintenanceBlocks = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const blocks = await prisma.maintenanceBlock.findMany({
      include: { facility: { select: { name: true, location: true } } },
      orderBy: { blockedDate: 'asc' },
    });
    res.json({ blocks });
  } catch (error) {
    next(error);
  }
};

export const deleteMaintenanceBlock = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.maintenanceBlock.delete({ where: { id } });
    res.json({ message: 'Maintenance block removed' });
  } catch (error) {
    next(error);
  }
};
