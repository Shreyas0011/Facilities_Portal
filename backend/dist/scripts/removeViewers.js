"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const User_1 = require("../models/User");
async function removeViewers() {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/facility_portal';
        console.log('Connecting to:', uri);
        await mongoose_1.default.connect(uri);
        console.log('Connected to MongoDB');
        const result = await User_1.User.deleteMany({ role: 'viewer' });
        console.log(`✅ Deleted ${result.deletedCount} viewer user(s) from the database.`);
        process.exit(0);
    }
    catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}
removeViewers();
