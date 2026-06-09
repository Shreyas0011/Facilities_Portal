import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { User } from '../models/User';

async function removeViewers() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/facility_portal';
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const result = await User.deleteMany({ role: 'viewer' });
    console.log(`✅ Deleted ${result.deletedCount} viewer user(s) from the database.`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

removeViewers();
