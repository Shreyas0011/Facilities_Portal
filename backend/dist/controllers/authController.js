"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleAuth = exports.changePassword = exports.updateProfile = exports.getProfile = exports.login = exports.signup = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const User_1 = require("../models/User");
const Booking_1 = require("../models/Booking");
const errorHandler_1 = require("../middleware/errorHandler");
// ─── Validation schemas ────────────────────────────────────────────────────────
const signupSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    role: zod_1.z.enum(['superadmin', 'admin', 'faculty', 'viewer']).default('viewer'),
    department: zod_1.z.string().optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address').toLowerCase(),
    password: zod_1.z.string().min(1, 'Password is required'),
});
// ─── Helpers ───────────────────────────────────────────────────────────────────
const generateToken = (user) => jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') });
// ─── Controllers ───────────────────────────────────────────────────────────────
const signup = async (req, res, next) => {
    try {
        const validated = signupSchema.parse(req.body);
        const existing = await User_1.User.findOne({ email: validated.email });
        if (existing)
            throw new errorHandler_1.AppError('User with this email already exists', 409);
        const hashedPassword = await bcryptjs_1.default.hash(validated.password, 10);
        const user = await User_1.User.create({
            name: validated.name,
            email: validated.email,
            password: hashedPassword,
            role: validated.role,
            department: validated.department,
        });
        const token = generateToken({ id: user._id.toString(), email: user.email, role: user.role, name: user.name });
        res.status(201).json({
            message: 'Account created successfully',
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                createdAt: user.createdAt,
            },
            token,
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
exports.signup = signup;
const login = async (req, res, next) => {
    try {
        const validated = loginSchema.parse(req.body);
        // Explicitly select password (hidden by default)
        const user = await User_1.User.findOne({ email: validated.email }).select('+password +firstLogin');
        if (!user || !user.password)
            throw new errorHandler_1.AppError('Invalid email or password', 401);
        if (!user.isActive)
            throw new errorHandler_1.AppError('Account is deactivated. Contact administrator.', 401);
        const isValid = await bcryptjs_1.default.compare(validated.password, user.password);
        if (!isValid)
            throw new errorHandler_1.AppError('Invalid email or password', 401);
        const token = generateToken({ id: user._id.toString(), email: user.email, role: user.role, name: user.name });
        res.json({
            message: 'Login successful',
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                avatar: user.avatar,
                isActive: user.isActive,
                firstLogin: user.firstLogin,
                first_login: user.firstLogin,
            },
            token,
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
exports.login = login;
const getProfile = async (req, res, next) => {
    try {
        const user = await User_1.User.findById(req.user.id);
        if (!user)
            throw new errorHandler_1.AppError('User not found', 404);
        // Count bookings separately
        const bookingCount = await Booking_1.Booking.countDocuments({ userId: req.user.id });
        res.json({
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                avatar: user.avatar,
                createdAt: user.createdAt,
                firstLogin: user.firstLogin,
                first_login: user.firstLogin,
                bookingCount,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res, next) => {
    try {
        const { name, department, avatar } = req.body;
        const user = await User_1.User.findByIdAndUpdate(req.user.id, { name, department, avatar }, { new: true, runValidators: true });
        if (!user)
            throw new errorHandler_1.AppError('User not found', 404);
        res.json({
            message: 'Profile updated',
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                avatar: user.avatar,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateProfile = updateProfile;
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword)
            throw new errorHandler_1.AppError('Current and new passwords are required', 400);
        const user = await User_1.User.findById(req.user.id).select('+password');
        if (!user || !user.password)
            throw new errorHandler_1.AppError('User not found', 404);
        const isValid = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isValid)
            throw new errorHandler_1.AppError('Invalid current password', 401);
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        user.password = hashedPassword;
        user.firstLogin = false; // Unset firstLogin after password change
        await user.save();
        res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.changePassword = changePassword;
const googleAuth = async (req, res, next) => {
    try {
        const { googleId, email, name, avatar } = req.body;
        if (!googleId || !email)
            throw new errorHandler_1.AppError('Google credentials required', 400);
        let user = await User_1.User.findOne({ $or: [{ googleId }, { email }] });
        if (!user) {
            user = await User_1.User.create({ name, email, googleId, avatar, role: 'viewer' });
        }
        else if (!user.googleId) {
            user = await User_1.User.findByIdAndUpdate(user._id, { googleId, avatar }, { new: true });
        }
        if (!user)
            throw new errorHandler_1.AppError('Failed to authenticate with Google', 500);
        const token = generateToken({ id: user._id.toString(), email: user.email, role: user.role, name: user.name });
        res.json({
            message: 'Google login successful',
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                isActive: user.isActive,
            },
            token,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.googleAuth = googleAuth;
