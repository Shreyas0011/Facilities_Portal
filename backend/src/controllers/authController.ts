import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['STUDENT', 'FACULTY', 'CLUB', 'ADMIN']).default('STUDENT'),
  department: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const generateToken = (user: { id: string; email: string; role: string; name: string }) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  );
};

export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = signupSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: validated.email } });
    if (existing) {
      throw new AppError('User with this email already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(validated.password, 12);

    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        password: hashedPassword,
        role: validated.role,
        department: validated.department,
      },
      select: { id: true, name: true, email: true, role: true, department: true, createdAt: true },
    });

    const token = generateToken({ id: user.id, email: user.email, role: user.role, name: user.name });

    res.status(201).json({ message: 'Account created successfully', user, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
      return;
    }
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
      select: { id: true, name: true, email: true, password: true, role: true, department: true, isActive: true, avatar: true },
    });

    if (!user || !user.password) {
      throw new AppError('Invalid email or password', 401);
    }
    if (!user.isActive) {
      throw new AppError('Account is deactivated. Contact administrator.', 401);
    }

    const isValid = await bcrypt.compare(validated.password, user.password);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role, name: user.name });

    const { password: _, ...userWithoutPassword } = user;
    res.json({ message: 'Login successful', user: userWithoutPassword, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
      return;
    }
    next(error);
  }
};

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, name: true, email: true, role: true,
        department: true, avatar: true, createdAt: true,
        _count: { select: { bookings: true } },
      },
    });
    if (!user) throw new AppError('User not found', 404);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, department, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name, department, avatar },
      select: { id: true, name: true, email: true, role: true, department: true, avatar: true },
    });
    res.json({ message: 'Profile updated', user });
  } catch (error) {
    next(error);
  }
};

export const googleAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { googleId, email, name, avatar } = req.body;
    if (!googleId || !email) {
      throw new AppError('Google credentials required', 400);
    }

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { name, email, googleId, avatar, role: 'STUDENT' },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId, avatar },
      });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role, name: user.name });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ message: 'Google login successful', user: userWithoutPassword, token });
  } catch (error) {
    next(error);
  }
};
