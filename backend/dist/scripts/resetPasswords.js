"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const User_1 = require("../models/User");
const resetPasswords = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || '';
        console.log('Connecting to database...');
        await mongoose_1.default.connect(mongoUri);
        console.log('Connected to MongoDB');
        const defaultPassword = 'Transcend@2026';
        const hashedPassword = await bcryptjs_1.default.hash(defaultPassword, 10);
        const result = await User_1.User.updateMany({}, {
            $set: {
                password: hashedPassword,
                firstLogin: true,
            }
        });
        console.log(`\n✅ Reset password for ${result.modifiedCount} users.`);
        console.log(`All users can now log in with: Transcend@2026`);
        process.exit(0);
    }
    catch (err) {
        console.error('Error resetting passwords:', err);
        process.exit(1);
    }
};
resetPasswords();
