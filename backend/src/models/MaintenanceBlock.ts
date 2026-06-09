import mongoose, { Schema, Document } from 'mongoose';

export interface IMaintenanceBlock extends Document {
  facilityId: mongoose.Types.ObjectId;
  blockedDate: Date;
  startTime: string;
  endTime: string;
  reason: string;
  createdAt: Date;
}

const MaintenanceBlockSchema = new Schema<IMaintenanceBlock>(
  {
    facilityId:  { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
    blockedDate: { type: Date, required: true },
    startTime:   { type: String, required: true },
    endTime:     { type: String, required: true },
    reason:      { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

MaintenanceBlockSchema.index({ facilityId: 1, blockedDate: 1 });

export const MaintenanceBlock = mongoose.model<IMaintenanceBlock>('MaintenanceBlock', MaintenanceBlockSchema);
