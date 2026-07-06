"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
async function check() {
    try {
        const mongoUri = process.env.MONGODB_URI || '';
        await mongoose_1.default.connect(mongoUri);
        console.log('Connected to MongoDB');
        const collections = await mongoose_1.default.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));
        process.exit(0);
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
