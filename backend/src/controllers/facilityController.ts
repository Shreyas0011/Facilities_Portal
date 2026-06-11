import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Facility } from '../models/Facility';
import { Booking } from '../models/Booking';
import { MaintenanceBlock } from '../models/MaintenanceBlock';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const facilitySchema = z.object({
  name:              z.string().min(2),
  description:       z.string().min(10),
  type: z.enum([
    'CLASSROOM', 'PROFESSIONAL_CLASSROOM', 'SEMINAR_HALL', 'THEATRE',
    'AUDITORIUM', 'LAB', 'SPORTS_FACILITY', 'MUSIC_DANCE_ROOM',
    'PODCAST_STUDIO', 'CAMERA_EQUIPMENT', 'CONFERENCE_ROOM',
    'PARKING_SLOT', 'HOSTEL_COMMON_AREA', 'OTHER',
  ]),
  capacity:          z.number().min(1),
  location:          z.string().min(2),
  building:          z.string().optional(),
  floor:             z.string().optional(),
  amenities:         z.array(z.string()).default([]),
  images:            z.array(z.string()).default([]),
  rules:             z.array(z.string()).default([]),
  availabilityStart: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
  availabilityEnd:   z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
  requiresApproval:  z.boolean().default(false),
});

export const getFacilities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, location, minCapacity, maxCapacity, search, building } = req.query;
    const filter: Record<string, any> = { isActive: true };

    if (type)     filter.type = type;
    if (building) filter.building = { $regex: building as string, $options: 'i' };
    if (location) filter.location = { $regex: location as string, $options: 'i' };
    if (minCapacity || maxCapacity) {
      filter.capacity = {};
      if (minCapacity) filter.capacity.$gte = parseInt(minCapacity as string);
      if (maxCapacity) filter.capacity.$lte = parseInt(maxCapacity as string);
    }
    if (search) {
      filter.$or = [
        { name:        { $regex: search as string, $options: 'i' } },
        { description: { $regex: search as string, $options: 'i' } },
        { location:    { $regex: search as string, $options: 'i' } },
      ];
    }

    const facilities = await Facility.find(filter).sort({ name: 1 });

    const facilitiesWithCount = await Promise.all(
      facilities.map(async (f) => {
        const bookingCount = await Booking.countDocuments({ facilityId: f._id });
        return { ...f.toJSON(), _count: { bookings: bookingCount } };
      })
    );

    res.json({ facilities: facilitiesWithCount });
  } catch (error) {
    next(error);
  }
};

export const getFacilityById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid facility ID', 400);

    const facility = await Facility.findById(id);
    if (!facility) throw new AppError('Facility not found', 404);

    const now = new Date();

    const [bookings, maintenanceBlocks, bookingCount] = await Promise.all([
      Booking.find({
        facilityId: facility._id,
        status:     { $in: ['APPROVED', 'PENDING'] },
        date:       { $gte: now },
      }).select('date startTime endTime status').limit(50),
      MaintenanceBlock.find({
        facilityId:  facility._id,
        blockedDate: { $gte: now },
      }).select('blockedDate startTime endTime reason'),
      Booking.countDocuments({ facilityId: facility._id }),
    ]);

    res.json({
      facility: {
        ...facility.toJSON(),
        _count: { bookings: bookingCount },
        bookings,
        maintenanceBlocks,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createFacility = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = facilitySchema.parse(req.body);
    const facility  = await Facility.create(validated);
    res.status(201).json({ message: 'Facility created successfully', facility });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    next(error);
  }
};

export const updateFacility = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid facility ID', 400);

    const validated = facilitySchema.partial().parse(req.body);
    const facility  = await Facility.findByIdAndUpdate(id, validated, { new: true, runValidators: true });
    if (!facility) throw new AppError('Facility not found', 404);

    res.json({ message: 'Facility updated', facility });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    next(error);
  }
};

export const deleteFacility = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid facility ID', 400);

    const facility = await Facility.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!facility) throw new AppError('Facility not found', 404);

    res.json({ message: 'Facility deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

export const getFacilityAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id       = req.params.id as string;
    const { date } = req.query;
    if (!date) { res.status(400).json({ error: 'Date parameter is required' }); return; }
    if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid facility ID', 400);

    const targetDate = new Date(date as string);
    const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);

    const [bookings, maintenanceBlocks] = await Promise.all([
      Booking.find({
        facilityId: id,
        date:       { $gte: startOfDay, $lte: endOfDay },
        status:     { $in: ['APPROVED', 'PENDING'] },
      }).select('startTime endTime status purpose'),
      MaintenanceBlock.find({
        facilityId:  id,
        blockedDate: { $gte: startOfDay, $lte: endOfDay },
      }).select('startTime endTime reason'),
    ]);

    res.json({ bookings, maintenanceBlocks });
  } catch (error) {
    next(error);
  }
};
