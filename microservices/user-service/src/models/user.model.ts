import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'admin' | 'trainer' | 'member';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  membershipId?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    address: {
      type: String,
    },
    membershipId: {
      type: String,
    },
    role: {
      type: String,
      enum: ['admin', 'trainer', 'member'],
      default: 'member',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
