"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Facility_1 = require("../models/Facility");
dotenv_1.default.config();
const facilities = [
    { name: "[V01] Multipurpose Hall [MPH]", type: "SEMINAR_HALL", capacity: 300, location: "Main Building - 4th Floor", description: "Large multipurpose hall for events, seminars, and gatherings.", category: "academic", icon: "calendar-days", isActive: true, availabilityStart: "08:00", availabilityEnd: "20:00" },
    { name: "[V02] PCR-1", type: "PROFESSIONAL_CLASSROOM", capacity: 60, location: "Main Building - Basement", description: "Professional classroom for interactive learning.", category: "academic", icon: "graduation-cap", isActive: true, availabilityStart: "08:00", availabilityEnd: "20:00" },
    { name: "[V03] PCR-2", type: "PROFESSIONAL_CLASSROOM", capacity: 60, location: "Main Building - Basement", description: "Professional classroom for interactive learning.", category: "academic", icon: "graduation-cap", isActive: true, availabilityStart: "08:00", availabilityEnd: "20:00" },
    { name: "[V04] PCR-4", type: "PROFESSIONAL_CLASSROOM", capacity: 60, location: "Main Building - Basement", description: "Professional classroom for interactive learning.", category: "academic", icon: "graduation-cap", isActive: true, availabilityStart: "08:00", availabilityEnd: "20:00" },
    { name: "[V05] Theater", type: "THEATRE", capacity: 150, location: "Main Building - Basement", description: "Theater space with stage and seating.", category: "media", icon: "clapperboard", isActive: true, availabilityStart: "08:00", availabilityEnd: "20:00" },
    { name: "[V06] Computer Lab-1", type: "LAB", capacity: 40, location: "Main Building - Basement", description: "Fully equipped computer laboratory.", category: "academic", icon: "laptop", isActive: true, availabilityStart: "08:00", availabilityEnd: "20:00" },
    { name: "[V07] Computer Lab-2", type: "LAB", capacity: 40, location: "Main Building - Basement", description: "Fully equipped computer laboratory.", category: "academic", icon: "laptop", isActive: true, availabilityStart: "08:00", availabilityEnd: "20:00" },
    { name: "[V08] Swimming Pool", type: "SPORTS_FACILITY", capacity: 50, location: "Sports Complex - Ground Floor", description: "Standard swimming pool for aquatic sports and recreation.", category: "recreation", icon: "waves", isActive: true, availabilityStart: "06:00", availabilityEnd: "21:00" },
    { name: "[V09] Dance & Fitness Studiio", type: "MUSIC_DANCE_ROOM", capacity: 40, location: "Sports Complex - 1st Floor", description: "Spacious studio for dance and fitness routines.", category: "recreation", icon: "music", isActive: true, availabilityStart: "06:00", availabilityEnd: "21:00" },
    { name: "[V10] Badminton Court", type: "SPORTS_FACILITY", capacity: 20, location: "Sports Complex - 2nd Floor", description: "Indoor badminton court with professional flooring.", category: "recreation", icon: "activity", isActive: true, availabilityStart: "06:00", availabilityEnd: "21:00" },
    { name: "[V11] Basketball Court - Main", type: "SPORTS_FACILITY", capacity: 100, location: "Food Fort - 1st Floor", description: "Main indoor basketball court.", category: "recreation", icon: "activity", isActive: true, availabilityStart: "06:00", availabilityEnd: "21:00" },
    { name: "[V12] Indoor Games Arena", type: "SPORTS_FACILITY", capacity: 80, location: "Girls Hostel Block - Ground Floor", description: "Arena for various indoor sports and games.", category: "recreation", icon: "dribbble", isActive: true, availabilityStart: "08:00", availabilityEnd: "22:00" },
    { name: "[V13] Basketball Court-2", type: "SPORTS_FACILITY", capacity: 50, location: "Turf Grounds - LG1", description: "Outdoor basketball court 2.", category: "recreation", icon: "activity", isActive: true, availabilityStart: "06:00", availabilityEnd: "18:00" },
    { name: "[V14] Basketball Court-3", type: "SPORTS_FACILITY", capacity: 50, location: "Turf Grounds - LG2", description: "Outdoor basketball court 3.", category: "recreation", icon: "activity", isActive: true, availabilityStart: "06:00", availabilityEnd: "18:00" },
    { name: "[V15] Volleyball Court", type: "SPORTS_FACILITY", capacity: 30, location: "Turf Grounds - LG3", description: "Outdoor volleyball court.", category: "recreation", icon: "activity", isActive: true, availabilityStart: "06:00", availabilityEnd: "18:00" },
    { name: "[V16] Cricket Nets", type: "SPORTS_FACILITY", capacity: 20, location: "Turf Grounds - LG4", description: "Cricket practice nets.", category: "recreation", icon: "activity", isActive: true, availabilityStart: "06:00", availabilityEnd: "18:00" },
    { name: "[V17] MP Grounds-1", type: "SPORTS_FACILITY", capacity: 200, location: "Turf Grounds - UG5", description: "Multipurpose sports ground 1.", category: "recreation", icon: "map", isActive: true, availabilityStart: "06:00", availabilityEnd: "18:00" },
    { name: "[V18] MP Grounds-2", type: "SPORTS_FACILITY", capacity: 200, location: "Turf Grounds - UG6", description: "Multipurpose sports ground 2.", category: "recreation", icon: "map", isActive: true, availabilityStart: "06:00", availabilityEnd: "18:00" },
    { name: "[V19] MP Grounds-3", type: "SPORTS_FACILITY", capacity: 200, location: "Turf Grounds - UG6", description: "Multipurpose sports ground 3.", category: "recreation", icon: "map", isActive: true, availabilityStart: "06:00", availabilityEnd: "18:00" },
    { name: "[V20] MP Grounds-4", type: "SPORTS_FACILITY", capacity: 200, location: "Turf Grounds - UG7", description: "Multipurpose sports ground 4.", category: "recreation", icon: "map", isActive: true, availabilityStart: "06:00", availabilityEnd: "18:00" },
    { name: "[V21] School Grounds", type: "SPORTS_FACILITY", capacity: 300, location: "School Building - 6th Floor", description: "Spacious school grounds for large activities.", category: "recreation", icon: "map", isActive: true, availabilityStart: "08:00", availabilityEnd: "18:00" },
    { name: "[V22] Karate Studio", type: "SPORTS_FACILITY", capacity: 40, location: "School Building - 5th Floor", description: "Dedicated studio for martial arts and karate.", category: "recreation", icon: "user", isActive: true, availabilityStart: "08:00", availabilityEnd: "20:00" },
    { name: "[V23] Dance Studio", type: "MUSIC_DANCE_ROOM", capacity: 40, location: "School Building - 5th Floor", description: "Dance studio with mirrors and sound system.", category: "media", icon: "music", isActive: true, availabilityStart: "08:00", availabilityEnd: "20:00" },
    { name: "[V24] TT Arena", type: "SPORTS_FACILITY", capacity: 30, location: "Boys Hostel - Ground Floor", description: "Table Tennis arena.", category: "recreation", icon: "dribbble", isActive: true, availabilityStart: "08:00", availabilityEnd: "22:00" },
];
async function seed() {
    try {
        await mongoose_1.default.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        // Remove existing
        await Facility_1.Facility.deleteMany({});
        console.log('Cleared existing facilities');
        // Insert new
        await Facility_1.Facility.insertMany(facilities);
        console.log('Successfully seeded facilities!');
        process.exit(0);
    }
    catch (error) {
        console.error('Error seeding:', error);
        process.exit(1);
    }
}
seed();
