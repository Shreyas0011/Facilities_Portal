"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Notification_1 = require("../models/Notification");
const errorHandler_1 = require("../middleware/errorHandler");
const getNotifications = async (req, res, next) => {
    try {
        const [notifications, unreadCount] = await Promise.all([
            Notification_1.Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50),
            Notification_1.Notification.countDocuments({ userId: req.user.id, readStatus: false }),
        ]);
        res.json({ notifications, unreadCount });
    }
    catch (error) {
        next(error);
    }
};
exports.getNotifications = getNotifications;
const markAsRead = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id))
            throw new errorHandler_1.AppError('Invalid notification ID', 400);
        await Notification_1.Notification.findOneAndUpdate({ _id: id, userId: req.user.id }, { readStatus: true });
        res.json({ message: 'Notification marked as read' });
    }
    catch (error) {
        next(error);
    }
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (req, res, next) => {
    try {
        await Notification_1.Notification.updateMany({ userId: req.user.id, readStatus: false }, { readStatus: true });
        res.json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        next(error);
    }
};
exports.markAllAsRead = markAllAsRead;
