import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const bookingSchema = z.object({
  facilityId: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
  purpose: z.string().min(5, 'Purpose must be at least 5 characters'),
  attendeesCount: z.number().min(1),
  notes: z.string().optional(),
  requirements: z.string().optional(),
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
) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Check existing bookings
  const existingBookings = await prisma.booking.findMany({
    where: {
      facilityId,
      date: { gte: startOfDay, lte: endOfDay },
      status: { in: ['APPROVED', 'PENDING'] },
      ...(excludeBookingId && { id: { not: excludeBookingId } }),
    },
    select: { id: true, startTime: true, endTime: true, status: true },
  });

  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(endTime);

  for (const booking of existingBookings) {
    const existingStart = timeToMinutes(booking.startTime);
    const existingEnd = timeToMinutes(booking.endTime);
    // Overlap check: existing.start < new.end && new.start < existing.end
    if (existingStart < newEnd && newStart < existingEnd) {
      return { conflict: true, reason: 'Time slot conflicts with an existing booking' };
    }
  }

  // Check maintenance blocks
  const maintenanceBlocks = await prisma.maintenanceBlock.findMany({
    where: {
      facilityId,
      blockedDate: { gte: startOfDay, lte: endOfDay },
    },
    select: { startTime: true, endTime: true, reason: true },
  });

  for (const block of maintenanceBlocks) {
    const blockStart = timeToMinutes(block.startTime);
    const blockEnd = timeToMinutes(block.endTime);
    if (blockStart < newEnd && newStart < blockEnd) {
      return { conflict: true, reason: `Facility is under maintenance: ${block.reason}` };
    }
  }

  return { conflict: false };
};

export const createBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = bookingSchema.parse(req.body);
    const userId = req.user!.id;

    const date = new Date(validated.date);
    if (isNaN(date.getTime())) {
      res.status(400).json({ error: 'Invalid date format' });
      return;
    }

    // Validate time range
    const startMins = timeToMinutes(validated.startTime);
    const endMins = timeToMinutes(validated.endTime);
    if (startMins >= endMins) {
      res.status(400).json({ error: 'End time must be after start time' });
      return;
    }
    if (endMins - startMins < 30) {
      res.status(400).json({ error: 'Minimum booking duration is 30 minutes' });
      return;
    }

    // Check facility exists
    const facility = await prisma.facility.findUnique({
      where: { id: validated.facilityId, isActive: true },
    });
    if (!facility) throw new AppError('Facility not found or inactive', 404);

    // Check capacity
    if (validated.attendeesCount > facility.capacity) {
      res.status(400).json({ error: `Attendees count exceeds facility capacity of ${facility.capacity}` });
      return;
    }

    // Check facility availability hours
    const facilityStart = timeToMinutes(facility.availabilityStart);
    const facilityEnd = timeToMinutes(facility.availabilityEnd);
    if (startMins < facilityStart || endMins > facilityEnd) {
      res.status(400).json({
        error: `Facility is only available from ${facility.availabilityStart} to ${facility.availabilityEnd}`,
      });
      return;
    }

    // Check conflicts
    const conflict = await checkConflict(validated.facilityId, date, validated.startTime, validated.endTime);
    if (conflict.conflict) {
      res.status(409).json({ error: conflict.reason });
      return;
    }

    // Determine if approval is needed
    const approvalRequired = facility.requiresApproval || req.user!.role === 'STUDENT';

    const booking = await prisma.booking.create({
      data: {
        facilityId: validated.facilityId,
        userId,
        date,
        startTime: validated.startTime,
        endTime: validated.endTime,
        purpose: validated.purpose,
        attendeesCount: validated.attendeesCount,
        notes: validated.notes,
        requirements: validated.requirements || null,
        status: approvalRequired ? 'PENDING' : 'APPROVED',
        approvalRequired,
      },
      include: {
        facility: { select: { name: true, location: true } },
        user: { select: { name: true, email: true } },
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        title: 'Booking Submitted',
        message: `Your booking for ${facility.name} on ${date.toDateString()} has been submitted${approvalRequired ? ' and is awaiting approval' : ' and approved'}.`,
        type: 'booking',
      },
    });

    res.status(201).json({
      message: approvalRequired ? 'Booking submitted for approval' : 'Booking confirmed',
      booking,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
      return;
    }
    next(error);
  }
};

export const getMyBookings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, upcoming } = req.query;
    const userId = req.user!.id;

    const where: any = { userId };
    if (status) where.status = status;
    if (upcoming === 'true') where.date = { gte: new Date() };

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        facility: { select: { id: true, name: true, location: true, type: true, images: true } },
        approval: { select: { status: true, remarks: true, timestamp: true } },
      },
      orderBy: { date: 'asc' },
    });

    res.json({ bookings });
  } catch (error) {
    next(error);
  }
};

export const getAllBookings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, facilityId, userId, from, to } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (facilityId) where.facilityId = facilityId;
    if (userId) where.userId = userId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from as string);
      if (to) where.date.lte = new Date(to as string);
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        facility: { select: { id: true, name: true, location: true, type: true } },
        user: { select: { id: true, name: true, email: true, role: true, department: true } },
        approval: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ bookings });
  } catch (error) {
    next(error);
  }
};

export const updateBookingStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { facility: true },
    });
    if (!booking) throw new AppError('Booking not found', 404);

    // Only owner can cancel their own booking
    if (status === 'CANCELLED') {
      if (booking.userId !== req.user!.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
        throw new AppError('Not authorized to cancel this booking', 403);
      }
    }

    // Only admins can approve/reject
    if (['APPROVED', 'REJECTED'].includes(status)) {
      if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
        throw new AppError('Only admins can approve or reject bookings', 403);
      }

      // Check for conflicts if approving
      if (status === 'APPROVED') {
        const conflict = await checkConflict(
          booking.facilityId,
          booking.date,
          booking.startTime,
          booking.endTime,
          id as string
        );
        if (conflict.conflict) {
          res.status(409).json({ error: conflict.reason });
          return;
        }
      }

      // Create or update approval record
      await prisma.approval.upsert({
        where: { bookingId: id },
        create: {
          bookingId: id,
          approvedById: req.user!.id,
          status: status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
          remarks,
        },
        update: {
          approvedById: req.user!.id,
          status: status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
          remarks,
          timestamp: new Date(),
        },
      });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        facility: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
    });

    // Notify the user
    const statusMessages: Record<string, string> = {
      APPROVED: `Your booking for ${booking.facility.name} has been approved!`,
      REJECTED: `Your booking for ${booking.facility.name} has been rejected. ${remarks ? `Reason: ${remarks}` : ''}`,
      CANCELLED: `Your booking for ${booking.facility.name} has been cancelled.`,
    };

    if (statusMessages[status]) {
      await prisma.notification.create({
        data: {
          userId: booking.userId,
          title: `Booking ${status}`,
          message: statusMessages[status],
          type: status === 'APPROVED' ? 'success' : 'info',
        },
      });
    }

    res.json({ message: `Booking ${status.toLowerCase()} successfully`, booking: updatedBooking });
  } catch (error) {
    next(error);
  }
};

export const deleteBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new AppError('Booking not found', 404);

    if (booking.userId !== req.user!.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
      throw new AppError('Not authorized', 403);
    }

    await prisma.booking.delete({ where: { id } });
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    next(error);
  }
};
