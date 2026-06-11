import mongoose, { Schema, Document } from 'mongoose';

export interface IApproval extends Document {
  bookingId: mongoose.Types.ObjectId;
  approvedById: mongoose.Types.ObjectId;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks?: string;
  timestamp: Date;
}

const ApprovalSchema = new Schema<IApproval>(
  {
    bookingId:    { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    approvedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    remarks:   { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  {
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

export const Approval = mongoose.model<IApproval>('Approval', ApprovalSchema);
