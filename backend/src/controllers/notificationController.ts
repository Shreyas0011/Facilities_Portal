import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Notification } from '../models/Notification';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user!.id }).sort({ createdAt: -1 }).limit(50),
      Notification.countDocuments({ userId: req.user!.id, readStatus: false }),
    ]);
    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid notification ID', 400);

    await Notification.findOneAndUpdate(
      { _id: id, userId: req.user!.id },
      { readStatus: true }
    );
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await Notification.updateMany(
      { userId: req.user!.id, readStatus: false },
      { readStatus: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};
