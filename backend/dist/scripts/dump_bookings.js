"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const Booking_1 = require("../models/Booking");
const Facility_1 = require("../models/Facility");
const run = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || '';
        console.log('Connecting to database...');
        await mongoose_1.default.connect(mongoUri);
        console.log('Connected to MongoDB');
        // Register Facility model
        const _modelName = Facility_1.Facility.modelName;
        const bookings = await Booking_1.Booking.find().populate('facilityId', 'name');
        console.log(`Found ${bookings.length} bookings total.`);
        // Filter bookings active on 2026-06-19
        const targetDateStr = '2026-06-19';
        const targetDate = new Date('2026-06-19');
        const active = bookings.filter(b => {
            if (b.isRecurring) {
                const bDateStr = b.date ? b.date.toISOString().split('T')[0] : '';
                if (targetDateStr < bDateStr)
                    return false;
                if (b.recurringEndDate) {
                    const endYMD = b.recurringEndDate.toISOString().split('T')[0];
                    if (targetDateStr > endYMD)
                        return false;
                }
                const dayOfWeek = targetDate.getDay();
                return Array.isArray(b.recurringDays) && b.recurringDays.includes(dayOfWeek);
            }
            const formattedBDate = b.date ? b.date.toISOString().split('T')[0] : '';
            return formattedBDate === targetDateStr;
        });
        console.log(`\nActive bookings on ${targetDateStr}:`);
        active.forEach(b => {
            console.log(`- Facility: ${b.facilityId?.name || 'Unknown'}, Time: ${b.startTime} - ${b.endTime}, isRecurring: ${b.isRecurring}, Status: ${b.status}`);
        });
        process.exit(0);
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
};
run();
