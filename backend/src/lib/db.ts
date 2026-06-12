import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Facility } from '../models/Facility';
import { Booking } from '../models/Booking';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://shreyas777999_db_user:w6sR7zMWIlSbGFbL@facility.iendyxs.mongodb.net/facility_portal?retryWrites=true&w=majority';

let mongoMemoryServer: any = null;

const usersToSeed = [
  { name: 'Prasanna Kumar K', email: 'prasannak@transcendgroup.org', role: 'superadmin' },
  { name: 'Pankaj M', email: 'pankajmatta@transcendgroup.org', role: 'superadmin' },
  { name: 'Siddharth K T', email: 'siddharth.kt@transcendgroup.org', role: 'superadmin' },
  { name: 'Shwetha S', email: 'shwetha.s@transcendgroup.org', role: 'superadmin' },
  { name: 'Prasad K', email: 'prasad@transcendgroup.org', role: 'admin' },
  { name: 'Niranjan D G', email: 'niranjan.dg@transcendgroup.org', role: 'admin' },
  { name: 'Padmaja N', email: 'padmaja@transcendgroup.org', role: 'admin' },
  { name: 'Ravi Kiran T N', email: 'ravikiran.tn@transcendgroup.org', role: 'viewer' },
  { name: 'Parimala S', email: 'parimalas@transcendgroup.org', role: 'viewer' },
  { name: 'Shruthi T R', email: 'shruthi.tr@transcendgroup.org', role: 'viewer' },
  { name: 'Divya J', email: 'divya.j@transcendgroup.org', role: 'viewer' },
  { name: 'Brinda R', email: 'BrindaR@transcendgroup.org', role: 'faculty' },
  { name: 'Annapoorna M', email: 'AnnapoornaM@transcendgroup.org', role: 'faculty' },
];

const facilitiesToSeed = [
  { name: "[V01] Multipurpose Hall [MPH]", type: "SEMINAR_HALL", capacity: 300, location: "Main Building - 4th Floor", description: "Large multipurpose hall for events, seminars, and gatherings.", category: "academic", icon: "calendar-days", isActive: true, availabilityStart: "08:00", availabilityEnd: "20:00" },
  { name: "[V02] PCR-1", type: "PROFESSIONAL_CLASSROOM", capacity: 60, location: "Main Building - Basement", description: "Professional classroom for interactive learning.", category: "academic", icon: "graduation-cap", isActive: true, availabilityStart: "08:00", availabilityEnd: "20:00" },
  { name: "[V03] PCR-2", type: "PROFESSIONAL_CLASSROOM", capacity: 60, location: "Main Building - Basement", description: "Professional classroom for interactive learning.", category: "academic", icon: "graduation-cap", isActive: true, availabilityStart: "08:00", availabilityEnd: "20:00" },
  { name: "[V05] Theater", type: "THEATRE", capacity: 150, location: "Main Building - Basement", description: "Theater space with stage and seating.", category: "media", icon: "clapperboard", isActive: true, availabilityStart: "08:00", availabilityEnd: "20:00" },
];

const seedInMemoryDB = async () => {
  try {
    console.log('Seeding in-memory database...');
    
    // Seed Users
    const hashedPassword = await bcrypt.hash('Transcend@2026', 10);
    const users = [];
    for (const u of usersToSeed) {
      const created = await User.create({
        name: u.name,
        email: u.email.toLowerCase(),
        password: hashedPassword,
        role: u.role,
        firstLogin: true,
      });
      users.push(created);
    }
    console.log(`Seeded ${users.length} users.`);

    // Seed Facilities
    const facilities = [];
    for (const f of facilitiesToSeed) {
      const created = await Facility.create(f);
      facilities.push(created);
    }
    console.log(`Seeded ${facilities.length} facilities.`);

    // Seed Bookings
    const requester = users.find(u => u.role === 'faculty') || users[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

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
    console.log('Successfully seeded bookings in-memory!');
  } catch (error) {
    console.error('Error seeding in-memory DB:', error);
  }
};

export const connectDB = async (): Promise<void> => {
  const isProduction = process.env.NODE_ENV === 'production';

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      dbName: 'facility_portal',
      serverSelectionTimeoutMS: isProduction ? 10000 : 2000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error: any) {
    if (isProduction) {
      // In production, never fall back to in-memory — fail fast with a clear message
      console.error('❌ MongoDB connection failed in production. Check your MONGODB_URI environment variable on Render.');
      console.error(error.message);
      process.exit(1);
    }

    console.warn('⚠️ MongoDB connection to Atlas failed. Spinning up in-memory MongoDB server...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      const uri = mongoMemoryServer.getUri();
      console.log(`🚀 In-memory MongoDB Server started at: ${uri}`);
      await mongoose.connect(uri, {
        dbName: 'facility_portal'
      });
      console.log('✅ Connected to In-memory MongoDB Server successfully.');
      await seedInMemoryDB();
    } catch (inMemError: any) {
      console.error('❌ Failed to start in-memory MongoDB server:', inMemError.message);
      process.exit(1);
    }
  }
};

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
    console.log('In-memory MongoDB server stopped');
  }
  console.log('MongoDB connection closed on app termination');
  process.exit(0);
});

export default mongoose;
