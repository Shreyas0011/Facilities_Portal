import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  role: 'superadmin' | 'admin' | 'faculty' | 'viewer';
  department?: string;
  avatar?: string;
  isActive: boolean;
  firstLogin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name:       { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:   { type: String, select: false },          // hidden by default
    googleId:   { type: String, sparse: true, unique: true },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'faculty', 'viewer'],
      default: 'faculty',
    },
    department: { type: String, trim: true },
    avatar:     { type: String },
    isActive:   { type: Boolean, default: true },
    firstLogin: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        ret.first_login = ret.firstLogin; // Map to what frontend expects
        delete ret._id;
        delete ret.__v;
        delete ret.password; // never leak password in JSON
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
