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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Facility = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const FACILITY_TYPES = [
    'CLASSROOM', 'PROFESSIONAL_CLASSROOM', 'SEMINAR_HALL', 'THEATRE',
    'AUDITORIUM', 'LAB', 'SPORTS_FACILITY', 'MUSIC_DANCE_ROOM',
    'PODCAST_STUDIO', 'CAMERA_EQUIPMENT', 'CONFERENCE_ROOM',
    'PARKING_SLOT', 'HOSTEL_COMMON_AREA', 'OTHER',
];
const FacilitySchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    type: { type: String, required: true, enum: FACILITY_TYPES },
    capacity: { type: Number, required: true, min: 1 },
    location: { type: String, required: true, trim: true },
    building: { type: String, trim: true },
    floor: { type: String, trim: true },
    amenities: [{ type: String }],
    images: [{ type: String }],
    rules: [{ type: String }],
    availabilityStart: { type: String, required: true },
    availabilityEnd: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    requiresApproval: { type: Boolean, default: false },
    category: { type: String, trim: true },
    icon: { type: String, trim: true },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            ret.id = ret._id.toString();
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
    toObject: { virtuals: true },
});
// Text index for search
FacilitySchema.index({ name: 'text', description: 'text', location: 'text' });
exports.Facility = mongoose_1.default.model('Facility', FacilitySchema);
