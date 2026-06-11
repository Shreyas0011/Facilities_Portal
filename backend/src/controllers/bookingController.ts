import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Booking } from '../models/Booking';
import { Approval } from '../models/Approval';
import { Facility } from '../models/Facility';
import { Notification } from '../models/Notification';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const bookingSchema = z.object({
  facilityId:    z.string().min(1),
  date:          z.string().min(1),
  startTime:     z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
  endTime:       z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
  purpose:       z.string().min(5, 'Purpose must be at least 5 characters'),
  attendeesCount: z.number().min(1),
  notes:         z.string().optional(),
  requirements:  z.string().optional(),
  pocName:       z.string().optional(),
  pocContact:    z.string().optional(),
});

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const checkConflict = async (
  facilityId: string,
  date: Date,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<{ conflict: boolean; reason?: string }> => {
  const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay   = new Date(date); endOfDay.setHours(23, 59, 59, 999);

  const bookingFilter: Record<string, any> = {
    facilityId,
    date:   { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['APPROVED', 'PENDING'] },
  };
  if (excludeBookingId) bookingFilter._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId) };

  const existingBookings = await Booking.find(bookingFilter).select('startTime endTime');

  const newStart = timeToMinutes(startTime);
  const newEnd   = timeToMinutes(endTime);

  for (const b of existingBookings) {
    const bStart = timeToMinutes(b.startTime);
    const bEnd   = timeToMinutes(b.endTime);
    if (bStart < newEnd && newStart < bEnd) {
      return { conflict: true, reason: 'Time slot conflicts with an existing booking' };
    }
  }

  const { MaintenanceBlock } = await import('../models/MaintenanceBlock');
  const blocks = await MaintenanceBlock.find({
    facilityId,
    blockedDate: { $gte: startOfDay, $lte: endOfDay },
  }).select('startTime endTime reason');

  for (const block of blocks) {
    const bStart = timeToMinutes(block.startTime);
    const bEnd   = timeToMinutes(block.endTime);
    if (bStart < newEnd && newStart < bEnd) {
      return { conflict: true, reason: `Facility is under maintenance: ${block.reason}` };
    }
  }

  return { conflict: false };
};

export const getPublicBookings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bookings = await Booking.find({ status: { $in: ['APPROVED', 'PENDING'] } })
      .populate('facilityId', 'id name location type')
      .populate('userId', 'name role')
      .sort({ date: 1 })
      .select('facilityId userId date startTime endTime purpose status isExternal');

    res.json({ bookings });
  } catch (error) {
    next(error);
  }
};

export const createBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = bookingSchema.parse(req.body);
    const userId    = req.user!.id;

    if (!mongoose.Types.ObjectId.isValid(validated.facilityId)) {
      res.status(400).json({ error: 'Invalid facility ID' }); return;
    }

    const date = new Date(validated.date);
    if (isNaN(date.getTime())) { res.status(400).json({ error: 'Invalid date format' }); return; }

    if (date.getUTCDay() === 0) {
      res.status(400).json({ error: 'Bookings are not allowed on Sundays' }); return;
    }


    // Validate time range
    const startMins = timeToMinutes(validated.startTime);
    const endMins   = timeToMinutes(validated.endTime);
    if (startMins >= endMins) { res.status(400).json({ error: 'End time must be after start time' }); return; }
    if (endMins - startMins < 30) { res.status(400).json({ error: 'Minimum booking duration is 30 minutes' }); return; }
    if (startMins < timeToMinutes('08:00') || endMins > timeToMinutes('16:00')) {
      res.status(400).json({ error: 'Facility is only available between 08:00 AM and 04:00 PM' }); return;
    }

    // Enforce fixed timing: 6 AM to 10 PM (06:00 to 22:00)
    const sixAm = timeToMinutes('06:00');
    const tenPm = timeToMinutes('22:00');
    if (startMins < sixAm || endMins > tenPm) {
      res.status(400).json({
        error: 'Facility is only available between 06:00 AM and 10:00 PM',
      });
      return;
    }

    const facility = await Facility.findOne({ _id: validated.facilityId, isActive: true });
    if (!facility) throw new AppError('Facility not found or inactive', 404);

    if (validated.attendeesCount > facility.capacity) {
      res.status(400).json({ error: `Attendees count exceeds facility capacity of ${facility.capacity}` }); return;
    }

    const facilityStart = timeToMinutes(facility.availabilityStart);
    const facilityEnd   = timeToMinutes(facility.availabilityEnd);
    if (startMins < facilityStart || endMins > facilityEnd) {
      res.status(400).json({ error: `Facility is only available from ${facility.availabilityStart} to ${facility.availabilityEnd}` }); return;
    }

    const conflict = await checkConflict(validated.facilityId, date, validated.startTime, validated.endTime);
    if (conflict.conflict) { res.status(409).json({ error: conflict.reason }); return; }

    // Check permission: viewers are read-only and cannot book
    if (req.user!.role === 'viewer') {
      res.status(403).json({ error: 'Viewers do not have permission to book facilities' });
      return;
    }

    // Determine if approval is needed
    const approvalRequired = facility.requiresApproval || req.user!.role === 'faculty';

    const booking = await Booking.create({
      facilityId:      validated.facilityId,
      userId,
      date,
      startTime:       validated.startTime,
      endTime:         validated.endTime,
      purpose:         validated.purpose,
      attendeesCount:  validated.attendeesCount,
      notes:           validated.notes,
      requirements:    validated.requirements,
      pocName:         validated.pocName,
      pocContact:      validated.pocContact,
      status:          approvalRequired ? 'PENDING' : 'APPROVED',
      approvalRequired,
    });

    await Notification.create({
      userId,
      title:   'Booking Submitted',
      message: `Your booking for ${facility.name} on ${date.toDateString()} has been submitted${approvalRequired ? ' and is awaiting approval' : ' and approved'}.`,
      type:    'booking',
    });

    const populated = await booking.populate([
      { path: 'facilityId', select: 'name location' },
      { path: 'userId',     select: 'name email' },
    ]);

    res.status(201).json({
      message: approvalRequired ? 'Booking submitted for approval' : 'Booking confirmed',
      booking: populated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues }); return;
    }
    next(error);
  }
};

export const getMyBookings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, upcoming } = req.query;
    const userId = req.user!.id;

    const filter: Record<string, any> = { userId };
    if (status)           filter.status = status;
    if (upcoming === 'true') filter.date = { $gte: new Date() };

    const bookings = await Booking.find(filter)
      .populate('facilityId', 'name location type images')
      .sort({ date: 1 });

    // Attach approvals
    const bookingIds = bookings.map((b: any) => b._id);
    const approvals  = await Approval.find({ bookingId: { $in: bookingIds } })
      .populate('approvedById', 'name role');

    const approvalMap = new Map(approvals.map((a: any) => [a.bookingId.toString(), a]));

    const result = bookings.map((b: any) => ({
      ...b.toJSON(),
      approval: approvalMap.get(b._id.toString()) ?? null,
    }));

    res.json({ bookings: result });
  } catch (error) {
    next(error);
  }
};

export const getAllBookings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, facilityId, userId, from, to } = req.query;

    const filter: Record<string, any> = {};
    if (status)     filter.status     = status as string;
    if (facilityId) filter.facilityId = facilityId as string;
    if (userId)     filter.userId     = userId as string;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from as string);
      if (to)   filter.date.$lte = new Date(to as string);
    }

    const bookings = await Booking.find(filter)
      .populate('facilityId', 'name location type')
      .populate('userId', 'name email role department')
      .sort({ createdAt: -1 });

    const bookingIds = bookings.map((b: any) => b._id);
    const approvals  = await Approval.find({ bookingId: { $in: bookingIds } })
      .populate('approvedById', 'name role');

    const approvalMap = new Map(approvals.map((a: any) => [a.bookingId.toString(), a]));

    const result = bookings.map((b: any) => ({
      ...b.toJSON(),
      approval: approvalMap.get(b._id.toString()) ?? null,
    }));

    res.json({ bookings: result });
  } catch (error) {
    next(error);
  }
};

export const updateBookingStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id              = req.params.id as string;
    const { status, remarks } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid booking ID', 400);

    const booking = await Booking.findById(id);
    if (!booking) throw new AppError('Booking not found', 404);

    if (status === 'CANCELLED') {
      if (booking.userId.toString() !== req.user!.id && !['admin', 'superadmin'].includes(req.user!.role)) {
        throw new AppError('Not authorized to cancel this booking', 403);
      }
    }

    if (['APPROVED', 'REJECTED'].includes(status)) {
      if (!['admin', 'superadmin'].includes(req.user!.role)) {
        throw new AppError('Only admins can approve or reject bookings', 403);
      }

      if (status === 'APPROVED') {
        const conflict = await checkConflict(
          booking.facilityId.toString(), booking.date, booking.startTime, booking.endTime, id
        );
        if (conflict.conflict) { res.status(409).json({ error: conflict.reason }); return; }
      }

      // Upsert approval record
      await Approval.findOneAndUpdate(
        { bookingId: id },
        {
          bookingId:    id,
          approvedById: req.user!.id,
          status:       status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
          remarks,
          timestamp:    new Date(),
        },
        { upsert: true, new: true }
      );
    }

    booking.status = status;
    await booking.save();
    
    let facilityName = 'Facility';
    if (booking.facilityId) {
       const facility = await Facility.findById(booking.facilityId);
       if (facility) facilityName = facility.name;
    }
    
    const approval = await Approval.findOne({ bookingId: id }).populate('approvedById', 'name role');

    const statusMessages: Record<string, string> = {
      APPROVED:  `Your booking for ${facilityName} has been approved!`,
      REJECTED:  `Your booking for ${facilityName} has been rejected.${remarks ? ` Reason: ${remarks}` : ''}`,
      CANCELLED: `Your booking for ${facilityName} has been cancelled.`,
    };

    if (statusMessages[status]) {
      await Notification.create({
        userId:  booking.userId,
        title:   `Booking ${status}`,
        message: statusMessages[status],
        type:    status === 'APPROVED' ? 'success' : 'info',
      });
    }

    res.json({ message: `Booking ${status.toLowerCase()} successfully`, booking: { ...booking.toJSON(), approval } });
  } catch (error) {
    next(error);
  }
};

export const deleteBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid booking ID', 400);

    const booking = await Booking.findById(id);
    if (!booking) throw new AppError('Booking not found', 404);

    if (booking.userId.toString() !== req.user!.id && !['admin', 'superadmin'].includes(req.user!.role)) {
      throw new AppError('Not authorized', 403);
    }

    await booking.deleteOne();
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    next(error);
  }
};
