import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Booking } from '../models/Booking';
import { Approval } from '../models/Approval';
import { Facility } from '../models/Facility';
import { User } from '../models/User';
import { MaintenanceBlock } from '../models/MaintenanceBlock';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const getAnalytics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const now           = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);

    const [
      totalBookings,
      pendingBookings,
      approvedBookings,
      cancelledBookings,
      totalFacilities,
      totalUsers,
      recentBookings,
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'PENDING' }),
      Booking.countDocuments({ status: 'APPROVED' }),
      Booking.countDocuments({ status: 'CANCELLED' }),
      Facility.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
      Booking.find({ createdAt: { $gte: sevenDaysAgo } })
        .populate('facilityId', 'name')
        .populate('userId', 'name role')
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    // Top 5 facilities by booking count (last 30 days)
    const facilityUsage = await Booking.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$facilityId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from:         'facilities',
          localField:   '_id',
          foreignField: '_id',
          as:           'facility',
        },
      },
      { $unwind: { path: '$facility', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          facilityId: '$_id',
          count:      1,
          facility: {
            id:   { $toString: '$facility._id' },
            name: '$facility.name',
            type: '$facility.type',
          },
        },
      },
    ]);

    // Bookings grouped by status
    const bookingsByStatus = await Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } },
    ]);

    // Daily trend (last 7 days)
    const dailyTrend = await Booking.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id:   { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', count: 1, _id: 0 } },
    ]);

    // Peak hours
    const hourData = await Booking.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, status: 'APPROVED' } },
      { $project: { hour: { $substr: ['$startTime', 0, 2] } } },
      { $group: { _id: '$hour', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
      { $project: { hour: { $concat: ['$_id', ':00'] }, count: 1, _id: 0 } },
    ]);

    res.json({
      overview: {
        totalBookings,
        pendingBookings,
        approvedBookings,
        cancelledBookings,
        totalFacilities,
        totalUsers,
        cancellationRate: totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(1) : 0,
        approvalRate:     totalBookings > 0 ? ((approvedBookings  / totalBookings) * 100).toFixed(1) : 0,
      },
      recentBookings,
      topFacilities: facilityUsage,
      bookingsByStatus,
      peakHours:     hourData,
      dailyTrend,
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingApprovals = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bookings = await Booking.find({ status: 'PENDING', approvalRequired: true })
      .populate('facilityId', 'id name location type')
      .populate('userId',     'id name email role department')
      .sort({ createdAt: 1 });

    const bookingIds = bookings.map((b) => b._id);
    const approvals  = await Approval.find({ bookingId: { $in: bookingIds } })
      .populate('approvedById', 'name role');

    const approvalMap = new Map(approvals.map((a) => [a.bookingId.toString(), a]));

    const result = bookings.map((b) => ({
      ...b.toJSON(),
      approval: approvalMap.get(b._id.toString()) ?? null,
    }));

    res.json({ bookings: result });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role, search } = req.query;
    const filter: Record<string, any> = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name:  { $regex: search as string, $options: 'i' } },
        { email: { $regex: search as string, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('id name email role department isActive createdAt')
      .sort({ createdAt: -1 });

    const usersWithCount = await Promise.all(
      users.map(async (u) => {
        const bookingCount = await Booking.countDocuments({ userId: u._id });
        return { ...u.toJSON(), _count: { bookings: bookingCount } };
      })
    );

    res.json({ users: usersWithCount });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id              = req.params.id as string;
    const { role, isActive }  = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid user ID', 400);

    if (role && req.user!.role !== 'superadmin') {
      throw new AppError('Only super admins can change user roles', 403);
    }

    const update: Record<string, any> = {};
    if (role     !== undefined) update.role     = role;
    if (isActive !== undefined) update.isActive = isActive;

    const user = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .select('id name email role isActive');
    if (!user) throw new AppError('User not found', 404);

    res.json({ message: 'User updated', user });
  } catch (error) {
    next(error);
  }
};

export const createMaintenanceBlock = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { facilityId, blockedDate, startTime, endTime, reason } = req.body;

    const facility = await Facility.findById(facilityId);
    if (!facility) throw new AppError('Facility not found', 404);

    const block = await MaintenanceBlock.create({
      facilityId,
      blockedDate: new Date(blockedDate),
      startTime,
      endTime,
      reason,
    });

    const populated = await block.populate('facilityId', 'name');
    res.status(201).json({ message: 'Maintenance block created', block: populated });
  } catch (error) {
    next(error);
  }
};

export const getMaintenanceBlocks = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const blocks = await MaintenanceBlock.find()
      .populate('facilityId', 'name location')
      .sort({ blockedDate: 1 });
    res.json({ blocks });
  } catch (error) {
    next(error);
  }
};

export const deleteMaintenanceBlock = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid block ID', 400);

    const block = await MaintenanceBlock.findByIdAndDelete(id);
    if (!block) throw new AppError('Maintenance block not found', 404);

    res.json({ message: 'Maintenance block removed' });
  } catch (error) {
    next(error);
  }
};
