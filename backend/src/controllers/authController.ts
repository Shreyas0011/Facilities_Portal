import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

// ─── Validation schemas ────────────────────────────────────────────────────────

const signupSchema = z.object({
  name:       z.string().min(2, 'Name must be at least 2 characters'),
  email:      z.string().email('Invalid email address'),
  password:   z.string().min(6, 'Password must be at least 6 characters'),
  role:       z.enum(['superadmin', 'admin', 'faculty']).default('faculty'),
  department: z.string().optional(),
});

const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

const generateToken = (user: { id: string; email: string; role: string; name: string }) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string } as jwt.SignOptions
  );

// ─── Controllers ───────────────────────────────────────────────────────────────

export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = signupSchema.parse(req.body);

    const existing = await User.findOne({ email: validated.email });
    if (existing) throw new AppError('User with this email already exists', 409);

    const hashedPassword = await bcrypt.hash(validated.password, 12);

    const user = await User.create({
      name:       validated.name,
      email:      validated.email,
      password:   hashedPassword,
      role:       validated.role,
      department: validated.department,
    });

    const token = generateToken({ id: user._id.toString(), email: user.email, role: user.role, name: user.name });

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id:         user._id.toString(),
        name:       user.name,
        email:      user.email,
        role:       user.role,
        department: user.department,
        createdAt:  user.createdAt,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = loginSchema.parse(req.body);

    // Explicitly select password (hidden by default)
    const user = await User.findOne({ email: validated.email }).select('+password +firstLogin');
    if (!user || !user.password) throw new AppError('Invalid email or password', 401);
    if (!user.isActive)          throw new AppError('Account is deactivated. Contact administrator.', 401);

    const isValid = await bcrypt.compare(validated.password, user.password);
    if (!isValid) throw new AppError('Invalid email or password', 401);

    const token = generateToken({ id: user._id.toString(), email: user.email, role: user.role, name: user.name });

    res.json({
      message: 'Login successful',
      user: {
        id:         user._id.toString(),
        name:       user.name,
        email:      user.email,
        role:       user.role,
        department: user.department,
        avatar:     user.avatar,
        isActive:   user.isActive,
        firstLogin: user.firstLogin,
        first_login: user.firstLogin,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    next(error);
  }
};

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id).select('-password +firstLogin');
    if (!user) throw new AppError('User not found', 404);

    // Count bookings separately
    const { Booking } = await import('../models/Booking');
    const bookingCount = await Booking.countDocuments({ userId: req.user!.id });

    res.json({
      user: {
        id:           user._id.toString(),
        name:         user.name,
        email:        user.email,
        role:         user.role,
        department:   user.department,
        avatar:       user.avatar,
        createdAt:    user.createdAt,
        firstLogin:   user.firstLogin,
        first_login:  user.firstLogin,
        bookingCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, department, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user!.id,
      { name, department, avatar },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) throw new AppError('User not found', 404);

    res.json({
      message: 'Profile updated',
      user: {
        id:         user._id.toString(),
        name:       user.name,
        email:      user.email,
        role:       user.role,
        department: user.department,
        avatar:     user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw new AppError('Current and new passwords are required', 400);

    const user = await User.findById(req.user!.id).select('+password');
    if (!user || !user.password) throw new AppError('User not found', 404);

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) throw new AppError('Invalid current password', 401);

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.firstLogin = false; // Unset firstLogin after password change
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

export const googleAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { googleId, email, name, avatar } = req.body;
    if (!googleId || !email) throw new AppError('Google credentials required', 400);

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      user = await User.create({ name, email, googleId, avatar, role: 'faculty' });
    } else if (!user.googleId) {
      user = await User.findByIdAndUpdate(user._id, { googleId, avatar }, { new: true })!;
    }

    if (!user) throw new AppError('Failed to authenticate with Google', 500);

    const token = generateToken({ id: user._id.toString(), email: user.email, role: user.role, name: user.name });

    res.json({
      message: 'Google login successful',
      user: {
        id:       user._id.toString(),
        name:     user.name,
        email:    user.email,
        role:     user.role,
        avatar:   user.avatar,
        isActive: user.isActive,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};
