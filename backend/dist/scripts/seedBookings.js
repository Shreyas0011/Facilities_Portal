"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Booking_1 = require("../models/Booking");
const Facility_1 = require("../models/Facility");
const User_1 = require("../models/User");
dotenv_1.default.config();
async function seed() {
    try {
        await mongoose_1.default.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        const facilities = await Facility_1.Facility.find();
        const users = await User_1.User.find();
        if (facilities.length === 0 || users.length === 0) {
            console.log('Need facilities and users to seed bookings.');
            process.exit(1);
        }
        const requester = users[0];
        const approver = users.find(u => u.role === 'admin' || u.role === 'superadmin') || users[1];
        await Booking_1.Booking.deleteMany({});
        console.log('Cleared existing bookings');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(14, 0, 0, 0);
        const bookings = [
            {
                facilityId: facilities[0]._id,
                userId: requester._id,
                purpose: "Guest Lecture on AI",
                date: tomorrow,
                startTime: "09:00",
                endTime: "11:00",
                attendeesCount: 40,
                requirements: "Projector, Mic",
                status: "APPROVED",
            },
            {
                facilityId: facilities[1]._id,
                userId: requester._id,
                purpose: "Faculty Meeting",
                date: nextWeek,
                startTime: "14:00",
                endTime: "15:00",
                attendeesCount: 20,
                requirements: "Whiteboard",
                status: "PENDING",
            },
        ];
        await Booking_1.Booking.insertMany(bookings);
        console.log('Successfully seeded bookings!');
        process.exit(0);
    }
    catch (error) {
        console.error('Error seeding:', error);
        process.exit(1);
    }
}
seed();
