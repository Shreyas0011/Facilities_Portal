import mongoose, { Schema, Document } from 'mongoose';

export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface IBooking extends Document {
  facilityId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  startTime: string;
  endTime: string;
  purpose: string;
  attendeesCount: number;
  notes?: string;
  requirements?: string;
  pocName?: string;
  pocContact?: string;
  status: BookingStatus;
  approvalRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    facilityId:      { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
    userId:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date:            { type: Date, required: true },
    startTime:       { type: String, required: true },
    endTime:         { type: String, required: true },
    purpose:         { type: String, required: true, minlength: 5 },
    attendeesCount:  { type: Number, required: true, min: 1 },
    notes:           { type: String },
    requirements:    { type: String },
    pocName:         { type: String },
    pocContact:      { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
    },
    approvalRequired: { type: Boolean, default: false },
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

// Index for conflict detection queries
BookingSchema.index({ facilityId: 1, date: 1, status: 1 });
BookingSchema.index({ userId: 1, createdAt: -1 });

export const Booking = mongoose.model<IBooking>('Booking', BookingSchema);
