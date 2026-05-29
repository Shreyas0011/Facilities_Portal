import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const facilitySchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  type: z.enum([
    'CLASSROOM',
    'PROFESSIONAL_CLASSROOM',
    'SEMINAR_HALL',
    'THEATRE',
    'AUDITORIUM',
    'LAB',
    'SPORTS_FACILITY',
    'MUSIC_DANCE_ROOM',
    'PODCAST_STUDIO',
    'CAMERA_EQUIPMENT',
    'CONFERENCE_ROOM',
    'PARKING_SLOT',
    'HOSTEL_COMMON_AREA',
    'OTHER'
  ]),
  capacity: z.number().min(1),
  location: z.string().min(2),
  building: z.string().optional(),
  floor: z.string().optional(),
  amenities: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  rules: z.array(z.string()).default([]),
  availabilityStart: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
  availabilityEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
  requiresApproval: z.boolean().default(false),
});

export const getFacilities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, location, minCapacity, maxCapacity, search, building } = req.query;

    const where: any = { isActive: true };
    if (type) where.type = type;
    if (building) where.building = { contains: building as string };
    if (location) where.location = { contains: location as string };
    if (minCapacity || maxCapacity) {
      where.capacity = {};
      if (minCapacity) where.capacity.gte = parseInt(minCapacity as string);
      if (maxCapacity) where.capacity.lte = parseInt(maxCapacity as string);
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { description: { contains: search as string } },
        { location: { contains: search as string } },
      ];
    }

    const facilities = await prisma.facility.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { bookings: true } },
      },
    });

    res.json({ facilities });
  } catch (error) {
    next(error);
  }
};

export const getFacilityById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const facility = await prisma.facility.findUnique({
      where: { id },
      include: {
        _count: { select: { bookings: true } },
        bookings: {
          where: {
            status: { in: ['APPROVED', 'PENDING'] },
            date: { gte: new Date() },
          },
          select: { date: true, startTime: true, endTime: true, status: true },
          take: 50,
        },
        maintenanceBlocks: {
          where: { blockedDate: { gte: new Date() } },
          select: { blockedDate: true, startTime: true, endTime: true, reason: true },
        },
      },
    });

    if (!facility) throw new AppError('Facility not found', 404);
    res.json({ facility });
  } catch (error) {
    next(error);
  }
};

export const createFacility = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = facilitySchema.parse(req.body);
    const data = {
      ...validated,
      amenities: JSON.stringify(validated.amenities),
      images: JSON.stringify(validated.images),
      rules: JSON.stringify(validated.rules)
    };
    const facility = await prisma.facility.create({ data: data as any });
    res.status(201).json({ message: 'Facility created successfully', facility });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
      return;
    }
    next(error);
  }
};

export const updateFacility = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const validated = facilitySchema.partial().parse(req.body);
    const data: any = { ...validated };
    if (validated.amenities) data.amenities = JSON.stringify(validated.amenities);
    if (validated.images) data.images = JSON.stringify(validated.images);
    if (validated.rules) data.rules = JSON.stringify(validated.rules);
    const facility = await prisma.facility.update({ where: { id }, data });
    res.json({ message: 'Facility updated', facility });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
      return;
    }
    next(error);
  }
};

export const deleteFacility = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.facility.update({ where: { id }, data: { isActive: false } });
    res.json({ message: 'Facility deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

export const getFacilityAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { date } = req.query;

    if (!date) {
      res.status(400).json({ error: 'Date parameter is required' });
      return;
    }

    const targetDate = new Date(date as string);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [bookings, maintenanceBlocks] = await Promise.all([
      prisma.booking.findMany({
        where: {
          facilityId: id,
          date: { gte: startOfDay, lte: endOfDay },
          status: { in: ['APPROVED', 'PENDING'] },
        },
        select: { startTime: true, endTime: true, status: true, purpose: true },
      }),
      prisma.maintenanceBlock.findMany({
        where: {
          facilityId: id,
          blockedDate: { gte: startOfDay, lte: endOfDay },
        },
        select: { startTime: true, endTime: true, reason: true },
      }),
    ]);

    res.json({ bookings, maintenanceBlocks });
  } catch (error) {
    next(error);
  }
};
