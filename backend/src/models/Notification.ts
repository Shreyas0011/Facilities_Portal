import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  readStatus: boolean;
  type: string;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title:      { type: String, required: true },
    message:    { type: String, required: true },
    readStatus: { type: Boolean, default: false },
    type:       { type: String, default: 'info' },
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

NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
