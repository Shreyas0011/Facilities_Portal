"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetUserPassword = exports.deleteUser = exports.deleteMaintenanceBlock = exports.getMaintenanceBlocks = exports.createMaintenanceBlock = exports.updateUser = exports.getUsers = exports.getPendingApprovals = exports.getAnalytics = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Booking_1 = require("../models/Booking");
const Facility_1 = require("../models/Facility");
const User_1 = require("../models/User");
const MaintenanceBlock_1 = require("../models/MaintenanceBlock");
const errorHandler_1 = require("../middleware/errorHandler");
const getAnalytics = async (req, res, next) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const [totalBookings, pendingBookings, approvedBookings, cancelledBookings, totalFacilities, totalUsers, recentBookings,] = await Promise.all([
            Booking_1.Booking.countDocuments(),
            Booking_1.Booking.countDocuments({ status: 'PENDING' }),
            Booking_1.Booking.countDocuments({ status: 'APPROVED' }),
            Booking_1.Booking.countDocuments({ status: 'CANCELLED' }),
            Facility_1.Facility.countDocuments({ isActive: true }),
            User_1.User.countDocuments({ isActive: true }),
            Booking_1.Booking.find({ createdAt: { $gte: sevenDaysAgo } })
                .populate('facilityId', 'name')
                .populate('userId', 'name role')
                .sort({ createdAt: -1 })
                .limit(10),
        ]);
        // Top 5 facilities by booking count (last 30 days)
        const facilityUsage = await Booking_1.Booking.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            { $group: { _id: '$facilityId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'facilities',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'facility',
                },
            },
            { $unwind: { path: '$facility', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    facilityId: '$_id',
                    count: 1,
                    facility: {
                        id: { $toString: '$facility._id' },
                        name: '$facility.name',
                        type: '$facility.type',
                    },
                },
            },
        ]);
        // Bookings grouped by status
        const bookingsByStatus = await Booking_1.Booking.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $project: { status: '$_id', count: 1, _id: 0 } },
        ]);
        // Daily trend (last 7 days)
        const dailyTrend = await Booking_1.Booking.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
            { $project: { date: '$_id', count: 1, _id: 0 } },
        ]);
        // Peak hours
        const hourData = await Booking_1.Booking.aggregate([
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
                approvalRate: totalBookings > 0 ? ((approvedBookings / totalBookings) * 100).toFixed(1) : 0,
            },
            recentBookings,
            topFacilities: facilityUsage,
            bookingsByStatus,
            peakHours: hourData,
            dailyTrend,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAnalytics = getAnalytics;
const getPendingApprovals = async (req, res, next) => {
    try {
        const bookings = await Booking_1.Booking.find({ status: 'PENDING' })
            .populate('facilityId', 'name location type')
            .populate('userId', 'name email role department')
            .sort({ createdAt: 1 });
        res.json({ bookings });
    }
    catch (error) {
        next(error);
    }
};
exports.getPendingApprovals = getPendingApprovals;
const getUsers = async (req, res, next) => {
    try {
        const { role, search } = req.query;
        const filter = {};
        if (role)
            filter.role = role;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }
        const users = await User_1.User.find(filter)
            .select('id name email role department isActive createdAt')
            .sort({ createdAt: -1 });
        const usersWithCount = await Promise.all(users.map(async (u) => {
            const bookingCount = await Booking_1.Booking.countDocuments({ userId: u._id });
            return { ...u.toJSON(), _count: { bookings: bookingCount } };
        }));
        res.json({ users: usersWithCount });
    }
    catch (error) {
        next(error);
    }
};
exports.getUsers = getUsers;
const updateUser = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { role, isActive } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id))
            throw new errorHandler_1.AppError('Invalid user ID', 400);
        // Super admin only for role changes
        if (role && req.user.role !== 'superadmin') {
            throw new errorHandler_1.AppError('Only super admins can change user roles', 403);
        }
        const update = {};
        if (role !== undefined)
            update.role = role;
        if (isActive !== undefined)
            update.isActive = isActive;
        const user = await User_1.User.findByIdAndUpdate(id, update, { new: true, runValidators: true })
            .select('id name email role isActive');
        if (!user)
            throw new errorHandler_1.AppError('User not found', 404);
        res.json({ message: 'User updated', user });
    }
    catch (error) {
        next(error);
    }
};
exports.updateUser = updateUser;
const createMaintenanceBlock = async (req, res, next) => {
    try {
        const { facilityId, blockedDate, startTime, endTime, reason } = req.body;
        const facility = await Facility_1.Facility.findById(facilityId);
        if (!facility)
            throw new errorHandler_1.AppError('Facility not found', 404);
        const block = await MaintenanceBlock_1.MaintenanceBlock.create({
            facilityId,
            blockedDate: new Date(blockedDate),
            startTime,
            endTime,
            reason,
        });
        const populated = await block.populate('facilityId', 'name');
        res.status(201).json({ message: 'Maintenance block created', block: populated });
    }
    catch (error) {
        next(error);
    }
};
exports.createMaintenanceBlock = createMaintenanceBlock;
const getMaintenanceBlocks = async (req, res, next) => {
    try {
        const blocks = await MaintenanceBlock_1.MaintenanceBlock.find()
            .populate('facilityId', 'name location')
            .sort({ blockedDate: 1 });
        res.json({ blocks });
    }
    catch (error) {
        next(error);
    }
};
exports.getMaintenanceBlocks = getMaintenanceBlocks;
const deleteMaintenanceBlock = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id))
            throw new errorHandler_1.AppError('Invalid block ID', 400);
        const block = await MaintenanceBlock_1.MaintenanceBlock.findByIdAndDelete(id);
        if (!block)
            throw new errorHandler_1.AppError('Maintenance block not found', 404);
        res.json({ message: 'Maintenance block removed' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteMaintenanceBlock = deleteMaintenanceBlock;
const deleteUser = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id))
            throw new errorHandler_1.AppError('Invalid user ID', 400);
        const user = await User_1.User.findByIdAndDelete(id);
        if (!user)
            throw new errorHandler_1.AppError('User not found', 404);
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteUser = deleteUser;
const resetUserPassword = async (req, res, next) => {
    try {
        if (req.user.role !== 'superadmin')
            throw new errorHandler_1.AppError('Only super admins can reset passwords', 403);
        const id = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id))
            throw new errorHandler_1.AppError('Invalid user ID', 400);
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6)
            throw new errorHandler_1.AppError('New password must be at least 6 characters', 400);
        const bcrypt = await Promise.resolve().then(() => __importStar(require('bcryptjs')));
        const hashed = await bcrypt.default.hash(newPassword, 10);
        const user = await User_1.User.findByIdAndUpdate(id, { password: hashed, firstLogin: true }, { new: true })
            .select('id name email role');
        if (!user)
            throw new errorHandler_1.AppError('User not found', 404);
        res.json({ message: `Password reset successfully for ${user.name}. They will be prompted to change it on next login.` });
    }
    catch (error) {
        next(error);
    }
};
exports.resetUserPassword = resetUserPassword;
