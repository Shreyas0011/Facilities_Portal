"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFacilityAvailability = exports.deleteFacility = exports.updateFacility = exports.createFacility = exports.getFacilityById = exports.getFacilities = void 0;
const zod_1 = require("zod");
const mongoose_1 = __importDefault(require("mongoose"));
const Facility_1 = require("../models/Facility");
const Booking_1 = require("../models/Booking");
const MaintenanceBlock_1 = require("../models/MaintenanceBlock");
const errorHandler_1 = require("../middleware/errorHandler");
const facilitySchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    description: zod_1.z.string().min(10),
    type: zod_1.z.enum([
        'CLASSROOM', 'PROFESSIONAL_CLASSROOM', 'SEMINAR_HALL', 'THEATRE',
        'AUDITORIUM', 'LAB', 'SPORTS_FACILITY', 'MUSIC_DANCE_ROOM',
        'PODCAST_STUDIO', 'CAMERA_EQUIPMENT', 'CONFERENCE_ROOM',
        'PARKING_SLOT', 'HOSTEL_COMMON_AREA', 'OTHER',
    ]),
    capacity: zod_1.z.number().min(1),
    location: zod_1.z.string().min(2),
    building: zod_1.z.string().optional(),
    floor: zod_1.z.string().optional(),
    amenities: zod_1.z.array(zod_1.z.string()).default([]),
    images: zod_1.z.array(zod_1.z.string()).default([]),
    rules: zod_1.z.array(zod_1.z.string()).default([]),
    availabilityStart: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
    availabilityEnd: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
    requiresApproval: zod_1.z.boolean().default(false),
});
const getFacilities = async (req, res, next) => {
    try {
        const { type, location, minCapacity, maxCapacity, search, building } = req.query;
        const filter = { isActive: true };
        if (type)
            filter.type = type;
        if (building)
            filter.building = { $regex: building, $options: 'i' };
        if (location)
            filter.location = { $regex: location, $options: 'i' };
        if (minCapacity || maxCapacity) {
            filter.capacity = {};
            if (minCapacity)
                filter.capacity.$gte = parseInt(minCapacity);
            if (maxCapacity)
                filter.capacity.$lte = parseInt(maxCapacity);
        }
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } },
            ];
        }
        const facilities = await Facility_1.Facility.find(filter).sort({ name: 1 });
        const facilitiesWithCount = await Promise.all(facilities.map(async (f) => {
            const bookingCount = await Booking_1.Booking.countDocuments({ facilityId: f._id });
            return { ...f.toJSON(), _count: { bookings: bookingCount } };
        }));
        res.json({ facilities: facilitiesWithCount });
    }
    catch (error) {
        next(error);
    }
};
exports.getFacilities = getFacilities;
const getFacilityById = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id))
            throw new errorHandler_1.AppError('Invalid facility ID', 400);
        const facility = await Facility_1.Facility.findById(id);
        if (!facility)
            throw new errorHandler_1.AppError('Facility not found', 404);
        const now = new Date();
        const [bookings, maintenanceBlocks, bookingCount] = await Promise.all([
            Booking_1.Booking.find({
                facilityId: facility._id,
                status: { $in: ['APPROVED', 'PENDING'] },
                date: { $gte: now },
            }).select('date startTime endTime status').limit(50),
            MaintenanceBlock_1.MaintenanceBlock.find({
                facilityId: facility._id,
                blockedDate: { $gte: now },
            }).select('blockedDate startTime endTime reason'),
            Booking_1.Booking.countDocuments({ facilityId: facility._id }),
        ]);
        res.json({
            facility: {
                ...facility.toJSON(),
                _count: { bookings: bookingCount },
                bookings,
                maintenanceBlocks,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getFacilityById = getFacilityById;
const createFacility = async (req, res, next) => {
    try {
        const validated = facilitySchema.parse(req.body);
        const facility = await Facility_1.Facility.create(validated);
        res.status(201).json({ message: 'Facility created successfully', facility });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.issues });
            return;
        }
        next(error);
    }
};
exports.createFacility = createFacility;
const updateFacility = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id))
            throw new errorHandler_1.AppError('Invalid facility ID', 400);
        const validated = facilitySchema.partial().parse(req.body);
        const facility = await Facility_1.Facility.findByIdAndUpdate(id, validated, { new: true, runValidators: true });
        if (!facility)
            throw new errorHandler_1.AppError('Facility not found', 404);
        res.json({ message: 'Facility updated', facility });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.issues });
            return;
        }
        next(error);
    }
};
exports.updateFacility = updateFacility;
const deleteFacility = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id))
            throw new errorHandler_1.AppError('Invalid facility ID', 400);
        const facility = await Facility_1.Facility.findByIdAndUpdate(id, { isActive: false }, { new: true });
        if (!facility)
            throw new errorHandler_1.AppError('Facility not found', 404);
        res.json({ message: 'Facility deactivated successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteFacility = deleteFacility;
const getFacilityAvailability = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { date } = req.query;
        if (!date) {
            res.status(400).json({ error: 'Date parameter is required' });
            return;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id))
            throw new errorHandler_1.AppError('Invalid facility ID', 400);
        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        const [bookings, maintenanceBlocks] = await Promise.all([
            Booking_1.Booking.find({
                facilityId: id,
                date: { $gte: startOfDay, $lte: endOfDay },
                status: { $in: ['APPROVED', 'PENDING'] },
            }).select('startTime endTime status purpose'),
            MaintenanceBlock_1.MaintenanceBlock.find({
                facilityId: id,
                blockedDate: { $gte: startOfDay, $lte: endOfDay },
            }).select('startTime endTime reason'),
        ]);
        res.json({ bookings, maintenanceBlocks });
    }
    catch (error) {
        next(error);
    }
};
exports.getFacilityAvailability = getFacilityAvailability;
