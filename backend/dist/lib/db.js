"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../models/User");
const Facility_1 = require("../models/Facility");
const Booking_1 = require("../models/Booking");
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://shreyas777999_db_user:w6sR7zMWIlSbGFbL@facility.iendyxs.mongodb.net/facility_portal?retryWrites=true&w=majority';
let mongoMemoryServer = null;
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
        const hashedPassword = await bcryptjs_1.default.hash('Transcend@2026', 10);
        const users = [];
        for (const u of usersToSeed) {
            const created = await User_1.User.create({
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
            const created = await Facility_1.Facility.create(f);
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
        await Booking_1.Booking.insertMany(bookings);
        console.log('Successfully seeded bookings in-memory!');
    }
    catch (error) {
        console.error('Error seeding in-memory DB:', error);
    }
};
const connectDB = async () => {
    const isProduction = process.env.NODE_ENV === 'production';
    try {
        const conn = await mongoose_1.default.connect(MONGODB_URI, {
            dbName: 'facility_portal',
            serverSelectionTimeoutMS: isProduction ? 10000 : 2000,
        });
        console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    }
    catch (error) {
        if (isProduction) {
            console.error('❌ MongoDB connection failed in production. The server will start but DB requests will fail. Check MONGODB_URI or MongoDB Atlas IP Access List.');
            console.error(error.message);
            return;
        }
        console.warn('⚠️ MongoDB connection to Atlas failed. Spinning up in-memory MongoDB server...');
        try {
            const { MongoMemoryServer } = await Promise.resolve().then(() => __importStar(require('mongodb-memory-server')));
            mongoMemoryServer = await MongoMemoryServer.create();
            const uri = mongoMemoryServer.getUri();
            console.log(`🚀 In-memory MongoDB Server started at: ${uri}`);
            await mongoose_1.default.connect(uri, {
                dbName: 'facility_portal'
            });
            console.log('✅ Connected to In-memory MongoDB Server successfully.');
            await seedInMemoryDB();
        }
        catch (inMemError) {
            console.error('❌ Failed to start in-memory MongoDB server:', inMemError.message);
            process.exit(1);
        }
    }
};
exports.connectDB = connectDB;
process.on('SIGINT', async () => {
    await mongoose_1.default.connection.close();
    if (mongoMemoryServer) {
        await mongoMemoryServer.stop();
        console.log('In-memory MongoDB server stopped');
    }
    console.log('MongoDB connection closed on app termination');
    process.exit(0);
});
exports.default = mongoose_1.default;
