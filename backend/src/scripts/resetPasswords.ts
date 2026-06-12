import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { User } from '../models/User';

const resetPasswords = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || '';
    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const defaultPassword = 'Transcend@2026';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const result = await User.updateMany(
      {},
      {
        $set: {
          password: hashedPassword,
          firstLogin: true,
        }
      }
    );

    console.log(`\n✅ Reset password for ${result.modifiedCount} users.`);
    console.log(`All users can now log in with: Transcend@2026`);
    process.exit(0);
  } catch (err) {
    console.error('Error resetting passwords:', err);
    process.exit(1);
  }
};

resetPasswords();
