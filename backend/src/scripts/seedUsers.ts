import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Adjust path as needed based on execution location
// Load the .env from the backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { User } from '../models/User';

const usersToSeed = [
  // Super Admin
  { name: 'Prasanna Kumar K', email: 'prasannak@transcendgroup.org', role: 'superadmin' },
  { name: 'Pankaj M', email: 'pankajmatta@transcendgroup.org', role: 'superadmin' },
  { name: 'Siddharth K T', email: 'siddharthkt@transcendgroup.org', role: 'superadmin' },
  { name: 'Shwetha S', email: 'shwethas@transcendgroup.org', role: 'superadmin' },

  // Admin for approval
  { name: 'Prasad K', email: 'prasad@transcendgroup.org', role: 'admin' },
  { name: 'Niranjan D G', email: 'niranjan.dg@transcendgroup.org', role: 'admin' },
  { name: 'Padmaja N', email: 'padmaja@transcendgroup.org', role: 'admin' },

  // View Access (viewer)
  { name: 'Ravi Kiran T N', email: 'ravikiran.tn@transcendgroup.org', role: 'viewer' },
  { name: 'Parimala S', email: 'parimalas@transcendgroup.org', role: 'viewer' },
  { name: 'Shruthi T R', email: 'shruthi.tr@transcendgroup.org', role: 'viewer' },
  { name: 'Divya J', email: 'divya.j@transcendgroup.org', role: 'viewer' },
  { name: 'R. Kokila', email: 'kokila.r@transcendgroup.org', role: 'viewer' },
  { name: 'Pooja Dikshith S', email: 'Poojadeekshith.S@transcendgroup.org', role: 'viewer' },
  { name: 'Vani Sridhar', email: 'Vani.Sridhar@transcendgroup.org', role: 'viewer' },
  { name: 'Rashmi Raghuram', email: 'rashmi.r@transcendgroup.org', role: 'viewer' },
  { name: 'SHRUTHI BL', email: 'shruthibl@transcendgroup.org', role: 'viewer' },
  { name: 'Swati S Pandit', email: 'swatipandit@transcendgroup.org', role: 'viewer' },
  { name: 'Meghana Bangalore', email: 'meghana@transcendgroup.org', role: 'viewer' },
  { name: 'Narasimhaiah K', email: 'NarasimhaiahK@transcendgroup.org', role: 'viewer' },
  { name: 'Vani S Rao', email: 'vani.rao@transcendgroup.org', role: 'viewer' },
  { name: 'Shravana Kumar', email: 'shravana.k@transcendgroup.org', role: 'viewer' },
  { name: 'Dr. K R Shashikala', email: 'Shashikalarao@transcendgroup.org', role: 'viewer' },
  { name: 'Agnel Trivikram G', email: 'AgnelTrivikramG@transcendgroup.org', role: 'viewer' },
  { name: 'Jessy Mathew', email: 'jessymathew@transcendgroup.org', role: 'viewer' },
  { name: 'Roopa Kambam', email: 'roopakambam@transcendgroup.org', role: 'viewer' },
  { name: 'Prashanth Jadav J', email: 'prashanth.j@transcendgroup.org', role: 'viewer' },
  { name: 'Reshma Belagaje', email: 'reshma.b@transcendgroup.org', role: 'viewer' },
  { name: 'G Shushma', email: 'shushma.g@transcendgroup.org', role: 'viewer' },
  { name: 'Pallavi A', email: 'Pallavi.A@transcendgroup.org', role: 'viewer' },

  // Users for request (faculty)
  { name: 'Brinda R', email: 'BrindaR@transcendgroup.org', role: 'faculty' },
  { name: 'Annapoorna M', email: 'AnnapoornaM@transcendgroup.org', role: 'faculty' },
  { name: 'Aparna Barengai', email: 'aparna.b@transcendgroup.org', role: 'faculty' },
  { name: 'C. Sree Lakshmi M', email: 'sreelakshmimenon@transcendgroup.org', role: 'faculty' },
  { name: 'Sneha Alok', email: 'Snehaalok@transcendgroup.org', role: 'faculty' },
  { name: 'Aarthy Vasudevan', email: 'aarthy.v@transcendgroup.org', role: 'faculty' },
  { name: 'Akshaykumar Kulkarni', email: 'Akshaykumarkulkarni@transcendgroup.org', role: 'faculty' },
  { name: 'Prathima S', email: 'PrathimaS@transcendgroup.org', role: 'faculty' },
  { name: 'Anusha Balaji', email: 'anusha.b@transcendgroup.org', role: 'faculty' },
  { name: 'SWATHI K IYER', email: 'swathi.iyer@transcendgroup.org', role: 'faculty' },
];

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/campus_facilities';
    console.log('Connecting to database:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const defaultPassword = 'Transcend@2026';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const padmajaHashedPassword = await bcrypt.hash('Transcend@26', 10);

    console.log(`Seeding ${usersToSeed.length} users...`);

    let addedCount = 0;
    for (const userData of usersToSeed) {
      const existing = await User.findOne({ email: userData.email.toLowerCase() });
      const isPadmaja = userData.email.toLowerCase() === 'padmaja@transcendgroup.org';
      const targetHash = isPadmaja ? padmajaHashedPassword : hashedPassword;

      if (!existing) {
        await User.create({
          name: userData.name,
          email: userData.email.toLowerCase(),
          password: targetHash,
          role: userData.role,
          firstLogin: true, // Requires changing password on first login
        });
        console.log(`Added user: ${userData.email}`);
        addedCount++;
      } else {
        if (isPadmaja) {
          existing.password = targetHash;
          existing.firstLogin = true;
        }
        existing.isActive = true;
        existing.role = userData.role as any;
        await existing.save();
        console.log(`Updated user: ${userData.email}`);
      }
    }

    console.log(`\nSeed Complete. Inserted ${addedCount} new users.`);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding DB:', err);
    process.exit(1);
  }
};

seedDB();
