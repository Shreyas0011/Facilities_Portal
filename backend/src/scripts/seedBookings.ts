import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Booking } from '../models/Booking';
import { Facility } from '../models/Facility';
import { User } from '../models/User';

dotenv.config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    const facilities = await Facility.find();
    const users = await User.find();

    if (facilities.length === 0 || users.length === 0) {
      console.log('Need facilities and users to seed bookings.');
      process.exit(1);
    }

    const requester = users[0];
    const approver = users.find(u => u.role === 'admin' || u.role === 'superadmin') || users[1];

    await Booking.deleteMany({});
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

    await Booking.insertMany(bookings);
    console.log('Successfully seeded bookings!');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error);
    process.exit(1);
  }
}

seed();
