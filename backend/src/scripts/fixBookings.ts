import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Booking } from '../models/Booking';

const run = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || '';
    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const bookings = await Booking.find({ startTime: '10:30', endTime: '12:00' });
    console.log(`Found ${bookings.length} bookings starting at 10:30 and ending at 12:00.`);

    for (const b of bookings) {
      console.log(`Updating booking ID ${b._id} on date ${b.date}`);
      b.endTime = '11:30';
      if (b.time && b.time.includes('12:00')) {
        b.time = b.time.replace('12:00 PM', '11:30 AM').replace('12:00', '11:30 AM');
      }
      await b.save();
    }

    console.log('Done updating bookings.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
