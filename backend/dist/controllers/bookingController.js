"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelBookingOccurrence = exports.deleteBooking = exports.updateBookingStatus = exports.getAllBookings = exports.getMyBookings = exports.createBooking = exports.getPublicBookings = void 0;
const zod_1 = require("zod");
const mongoose_1 = __importDefault(require("mongoose"));
const Booking_1 = require("../models/Booking");
const Approval_1 = require("../models/Approval");
const Facility_1 = require("../models/Facility");
const Notification_1 = require("../models/Notification");
const MaintenanceBlock_1 = require("../models/MaintenanceBlock");
const User_1 = require("../models/User");
const errorHandler_1 = require("../middleware/errorHandler");
const bookingSchema = zod_1.z.object({
    facilityId: zod_1.z.string().min(1),
    date: zod_1.z.string().min(1),
    startTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
    endTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
    purpose: zod_1.z.string().min(2, 'Purpose must be at least 2 characters'),
    attendeesCount: zod_1.z.number().optional(),
    notes: zod_1.z.string().optional(),
    requirements: zod_1.z.string().optional(),
    pocName: zod_1.z.string().optional(),
    pocContact: zod_1.z.string().optional(),
    isExternal: zod_1.z.boolean().optional(),
    isRecurring: zod_1.z.boolean().optional(),
    recurringDays: zod_1.z.array(zod_1.z.number()).optional(),
    recurringEndDate: zod_1.z.string().nullable().optional(),
});
const timeToMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};
const checkConflict = async (facilityId, date, startTime, endTime, isRecurring, recurringDays, recurringEndDate, excludeBookingId) => {
    const getYYYYMMDD = (d) => d.toISOString().split('T')[0];
    // 1. Generate target dates to check
    const targetDates = [];
    if (isRecurring && recurringDays && recurringDays.length > 0) {
        const start = new Date(date);
        const end = recurringEndDate ? new Date(recurringEndDate) : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        const current = new Date(start);
        while (current <= end) {
            if (recurringDays.includes(current.getDay())) {
                targetDates.push(new Date(current));
            }
            current.setDate(current.getDate() + 1);
        }
    }
    else {
        targetDates.push(new Date(date));
    }
    if (targetDates.length === 0)
        return { conflict: false };
    // 2. Fetch all active bookings for this facility
    const candidateFilter = {
        facilityId,
        status: { $in: ['APPROVED', 'PENDING'] },
    };
    if (excludeBookingId)
        candidateFilter._id = { $ne: new mongoose_1.default.Types.ObjectId(excludeBookingId) };
    const existingBookings = await Booking_1.Booking.find(candidateFilter);
    // 3. Fetch all maintenance blocks for this facility
    const blocks = await MaintenanceBlock_1.MaintenanceBlock.find({ facilityId });
    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);
    // 4. Check each target occurrence date for overlaps
    for (const targetDate of targetDates) {
        const targetYMD = getYYYYMMDD(targetDate);
        const targetDayOfWeek = targetDate.getDay();
        // Check bookings
        for (const b of existingBookings) {
            const bDateStr = getYYYYMMDD(b.date);
            let overlapsDate = false;
            if (b.isRecurring) {
                if (targetYMD >= bDateStr) {
                    const endYMD = b.recurringEndDate ? getYYYYMMDD(b.recurringEndDate) : null;
                    if (!endYMD || targetYMD <= endYMD) {
                        if (b.recurringDays && b.recurringDays.includes(targetDayOfWeek)) {
                            overlapsDate = true;
                        }
                    }
                }
            }
            else {
                if (bDateStr === targetYMD) {
                    overlapsDate = true;
                }
            }
            if (overlapsDate) {
                const bStart = timeToMinutes(b.startTime);
                const bEnd = timeToMinutes(b.endTime);
                if (bStart < newEnd && newStart < bEnd) {
                    return {
                        conflict: true,
                        reason: `Time slot conflicts with an existing booking on ${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
                    };
                }
            }
        }
        // Check maintenance blocks
        for (const block of blocks) {
            const blockYMD = getYYYYMMDD(block.blockedDate);
            if (blockYMD === targetYMD) {
                const bStart = timeToMinutes(block.startTime);
                const bEnd = timeToMinutes(block.endTime);
                if (bStart < newEnd && newStart < bEnd) {
                    return {
                        conflict: true,
                        reason: `Facility is under maintenance on ${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}: ${block.reason}`,
                    };
                }
            }
        }
    }
    return { conflict: false };
};
const getPublicBookings = async (_req, res, next) => {
    try {
        const bookings = await Booking_1.Booking.find({ status: { $in: ['APPROVED', 'PENDING'] } })
            .populate('facilityId', 'id name location type')
            .populate('userId', 'name role')
            .sort({ date: 1 })
            .select('facilityId userId date startTime endTime purpose status isExternal isRecurring recurringDays recurringEndDate');
        res.json({ bookings });
    }
    catch (error) {
        next(error);
    }
};
exports.getPublicBookings = getPublicBookings;
const createBooking = async (req, res, next) => {
    try {
        const validated = bookingSchema.parse(req.body);
        const userId = req.user.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(validated.facilityId)) {
            res.status(400).json({ error: 'Invalid facility ID' });
            return;
        }
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
        // Enforce fixed timing: 6 AM to 10 PM (06:00 to 22:00)
        const sixAm = timeToMinutes('06:00');
        const tenPm = timeToMinutes('22:00');
        if (startMins < sixAm || endMins > tenPm) {
            res.status(400).json({
                error: 'Facility is only available between 06:00 AM and 10:00 PM',
            });
            return;
        }
        // Restrict bookings after 8:00 PM local time (IST) to Padmaja N
        const getLocalHour = () => {
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Kolkata',
                hour: 'numeric',
                hour12: false
            });
            return parseInt(formatter.format(new Date()), 10);
        };
        const currentHour = getLocalHour();
        if (currentHour >= 20 || currentHour < 6) {
            const isPadmaja = req.user?.email?.toLowerCase() === 'padmaja@transcendgroup.org';
            if (!isPadmaja) {
                res.status(403).json({
                    error: 'Booking after 8pm is not allowed, please contact Padmaja N in case of any booking, Thank You',
                });
                return;
            }
        }
        const facility = await Facility_1.Facility.findOne({ _id: validated.facilityId, isActive: true });
        if (!facility)
            throw new errorHandler_1.AppError('Facility not found or inactive', 404);
        if (validated.attendeesCount !== undefined && validated.attendeesCount > facility.capacity) {
            res.status(400).json({ error: `Attendees count exceeds facility capacity of ${facility.capacity}` });
            return;
        }
        // Per-facility window intentionally removed — global 06:00–22:00 rule above applies
        const conflict = await checkConflict(validated.facilityId, date, validated.startTime, validated.endTime, validated.isRecurring, validated.recurringDays, validated.recurringEndDate ? new Date(validated.recurringEndDate) : null);
        if (conflict.conflict) {
            res.status(409).json({ error: conflict.reason });
            return;
        }
        // Check permission: viewers are read-only and cannot book
        if (req.user.role === 'viewer') {
            res.status(403).json({ error: 'Viewers do not have permission to book facilities' });
            return;
        }
        // Determine if approval is needed
        const approvalRequired = facility.requiresApproval || req.user.role === 'faculty';
        const booking = await Booking_1.Booking.create({
            facilityId: validated.facilityId,
            userId,
            date,
            startTime: validated.startTime,
            endTime: validated.endTime,
            purpose: validated.purpose,
            attendeesCount: validated.attendeesCount,
            notes: validated.notes,
            requirements: validated.requirements,
            pocName: validated.pocName,
            pocContact: validated.pocContact,
            isExternal: validated.isExternal,
            isRecurring: validated.isRecurring,
            recurringDays: validated.recurringDays,
            recurringEndDate: validated.recurringEndDate ? new Date(validated.recurringEndDate) : null,
            status: approvalRequired ? 'PENDING' : 'APPROVED',
            approvalRequired,
        });
        await Notification_1.Notification.create({
            userId,
            title: 'Booking Submitted',
            message: `Your booking for ${facility.name} on ${date.toDateString()} has been submitted${approvalRequired ? ' and is awaiting approval' : ' and approved'}.`,
            type: 'booking',
        });
        // Notify all admins and superadmins
        try {
            const admins = await User_1.User.find({ role: { $in: ['admin', 'superadmin'] } });
            for (const admin of admins) {
                await Notification_1.Notification.create({
                    userId: admin._id,
                    title: 'New Booking Request',
                    message: `${req.user.name} has requested to reserve ${facility.name} on ${date.toDateString()}.`,
                    type: 'booking',
                });
            }
        }
        catch (err) {
            console.error('Failed to notify admins:', err);
        }
        const populated = await booking.populate([
            { path: 'facilityId', select: 'name location' },
            { path: 'userId', select: 'name email' },
        ]);
        res.status(201).json({
            message: approvalRequired ? 'Booking submitted for approval' : 'Booking confirmed',
            booking: populated,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.issues });
            return;
        }
        next(error);
    }
};
exports.createBooking = createBooking;
const getMyBookings = async (req, res, next) => {
    try {
        const { status, upcoming } = req.query;
        const userId = req.user.id;
        const filter = { userId };
        if (status)
            filter.status = status;
        if (upcoming === 'true')
            filter.date = { $gte: new Date() };
        const bookings = await Booking_1.Booking.find(filter)
            .populate('facilityId', 'name location type images')
            .sort({ date: 1 });
        // Attach approvals
        const bookingIds = bookings.map((b) => b._id);
        const approvals = await Approval_1.Approval.find({ bookingId: { $in: bookingIds } })
            .populate('approvedById', 'name role');
        const approvalMap = new Map(approvals.map((a) => [a.bookingId.toString(), a]));
        const result = bookings.map((b) => ({
            ...b.toJSON(),
            approval: approvalMap.get(b._id.toString()) ?? null,
        }));
        res.json({ bookings: result });
    }
    catch (error) {
        next(error);
    }
};
exports.getMyBookings = getMyBookings;
const getAllBookings = async (req, res, next) => {
    try {
        const { status, facilityId, userId, from, to } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        if (facilityId)
            filter.facilityId = facilityId;
        if (userId)
            filter.userId = userId;
        if (from || to) {
            filter.date = {};
            if (from)
                filter.date.$gte = new Date(from);
            if (to)
                filter.date.$lte = new Date(to);
        }
        const bookings = await Booking_1.Booking.find(filter)
            .populate('facilityId', 'name location type')
            .populate('userId', 'name email role department')
            .sort({ createdAt: -1 });
        const bookingIds = bookings.map((b) => b._id);
        const approvals = await Approval_1.Approval.find({ bookingId: { $in: bookingIds } })
            .populate('approvedById', 'name role');
        const approvalMap = new Map(approvals.map((a) => [a.bookingId.toString(), a]));
        const result = bookings.map((b) => ({
            ...b.toJSON(),
            approval: approvalMap.get(b._id.toString()) ?? null,
        }));
        res.json({ bookings: result });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllBookings = getAllBookings;
const updateBookingStatus = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { status, remarks } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id))
            throw new errorHandler_1.AppError('Invalid booking ID', 400);
        const booking = await Booking_1.Booking.findById(id);
        if (!booking)
            throw new errorHandler_1.AppError('Booking not found', 404);
        if (status === 'CANCELLED') {
            if (booking.userId.toString() !== req.user.id && !['admin', 'superadmin'].includes(req.user.role)) {
                throw new errorHandler_1.AppError('Not authorized to cancel this booking', 403);
            }
        }
        if (['APPROVED', 'REJECTED'].includes(status)) {
            if (!['admin', 'superadmin'].includes(req.user.role)) {
                throw new errorHandler_1.AppError('Only admins can approve or reject bookings', 403);
            }
            if (status === 'APPROVED') {
                const conflict = await checkConflict(booking.facilityId.toString(), booking.date, booking.startTime, booking.endTime, booking.isRecurring, booking.recurringDays, booking.recurringEndDate, id);
                if (conflict.conflict) {
                    res.status(409).json({ error: conflict.reason });
                    return;
                }
            }
            // Upsert approval record
            await Approval_1.Approval.findOneAndUpdate({ bookingId: id }, {
                bookingId: id,
                approvedById: req.user.id,
                status: status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
                remarks,
                timestamp: new Date(),
            }, { upsert: true, new: true });
        }
        booking.status = status;
        await booking.save();
        let facilityName = 'Facility';
        if (booking.facilityId) {
            const facility = await Facility_1.Facility.findById(booking.facilityId);
            if (facility)
                facilityName = facility.name;
        }
        const approval = await Approval_1.Approval.findOne({ bookingId: id }).populate('approvedById', 'name role');
        const statusMessages = {
            APPROVED: `Your booking for ${facilityName} has been approved!`,
            REJECTED: `Your booking for ${facilityName} has been rejected.${remarks ? ` Reason: ${remarks}` : ''}`,
            CANCELLED: `Your booking for ${facilityName} has been cancelled.`,
        };
        if (statusMessages[status]) {
            await Notification_1.Notification.create({
                userId: booking.userId,
                title: `Booking ${status}`,
                message: statusMessages[status],
                type: status === 'APPROVED' ? 'success' : 'info',
            });
        }
        res.json({ message: `Booking ${status.toLowerCase()} successfully`, booking: { ...booking.toJSON(), approval } });
    }
    catch (error) {
        next(error);
    }
};
exports.updateBookingStatus = updateBookingStatus;
const deleteBooking = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id))
            throw new errorHandler_1.AppError('Invalid booking ID', 400);
        const booking = await Booking_1.Booking.findById(id);
        if (!booking)
            throw new errorHandler_1.AppError('Booking not found', 404);
        if (booking.userId.toString() !== req.user.id && !['admin', 'superadmin'].includes(req.user.role)) {
            throw new errorHandler_1.AppError('Not authorized', 403);
        }
        await booking.deleteOne();
        res.json({ message: 'Booking deleted successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteBooking = deleteBooking;
const cancelBookingOccurrence = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { date } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id))
            throw new errorHandler_1.AppError('Invalid booking ID', 400);
        if (!date)
            throw new errorHandler_1.AppError('Date is required to cancel occurrence', 400);
        const booking = await Booking_1.Booking.findById(id);
        if (!booking)
            throw new errorHandler_1.AppError('Booking not found', 404);
        if (!booking.isRecurring) {
            throw new errorHandler_1.AppError('Cannot cancel occurrence of a non-recurring booking', 400);
        }
        if (booking.userId.toString() !== req.user.id && !['admin', 'superadmin'].includes(req.user.role)) {
            throw new errorHandler_1.AppError('Not authorized', 403);
        }
        if (!booking.cancelledDates) {
            booking.cancelledDates = [];
        }
        if (!booking.cancelledDates.includes(date)) {
            booking.cancelledDates.push(date);
            await booking.save();
        }
        res.json({ message: 'Occurrence cancelled successfully', booking });
    }
    catch (error) {
        next(error);
    }
};
exports.cancelBookingOccurrence = cancelBookingOccurrence;
