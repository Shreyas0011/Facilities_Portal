import mongoose, { Schema, Document } from 'mongoose';

export type FacilityType =
  | 'CLASSROOM'
  | 'PROFESSIONAL_CLASSROOM'
  | 'SEMINAR_HALL'
  | 'THEATRE'
  | 'AUDITORIUM'
  | 'LAB'
  | 'SPORTS_FACILITY'
  | 'MUSIC_DANCE_ROOM'
  | 'PODCAST_STUDIO'
  | 'CAMERA_EQUIPMENT'
  | 'CONFERENCE_ROOM'
  | 'PARKING_SLOT'
  | 'HOSTEL_COMMON_AREA'
  | 'OTHER';

export interface IFacility extends Document {
  name: string;
  description: string;
  type: FacilityType;
  capacity: number;
  location: string;
  building?: string;
  floor?: string;
  amenities: string[];
  images: string[];
  rules: string[];
  availabilityStart: string; // "HH:MM"
  availabilityEnd: string;   // "HH:MM"
  isActive: boolean;
  requiresApproval: boolean;
  category?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FACILITY_TYPES: FacilityType[] = [
  'CLASSROOM', 'PROFESSIONAL_CLASSROOM', 'SEMINAR_HALL', 'THEATRE',
  'AUDITORIUM', 'LAB', 'SPORTS_FACILITY', 'MUSIC_DANCE_ROOM',
  'PODCAST_STUDIO', 'CAMERA_EQUIPMENT', 'CONFERENCE_ROOM',
  'PARKING_SLOT', 'HOSTEL_COMMON_AREA', 'OTHER',
];

const FacilitySchema = new Schema<IFacility>(
  {
    name:              { type: String, required: true, trim: true },
    description:       { type: String, required: true },
    type:              { type: String, required: true, enum: FACILITY_TYPES },
    capacity:          { type: Number, required: true, min: 1 },
    location:          { type: String, required: true, trim: true },
    building:          { type: String, trim: true },
    floor:             { type: String, trim: true },
    amenities:         [{ type: String }],
    images:            [{ type: String }],
    rules:             [{ type: String }],
    availabilityStart: { type: String, required: true },
    availabilityEnd:   { type: String, required: true },
    isActive:          { type: Boolean, default: true },
    requiresApproval:  { type: Boolean, default: false },
    category:          { type: String, trim: true },
    icon:              { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Text index for search
FacilitySchema.index({ name: 'text', description: 'text', location: 'text' });

export const Facility = mongoose.model<IFacility>('Facility', FacilitySchema);
