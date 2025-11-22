import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserRole = 'admin' | 'trainer' | 'member';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  fullName: string;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop()
  address?: string;

  @Prop()
  membershipId?: string; // ID reference to Subscription Service

  @Prop({ required: true, enum: ['admin', 'trainer', 'member'], default: 'member' })
  role: UserRole;
}

export const UserSchema = SchemaFactory.createForClass(User);
