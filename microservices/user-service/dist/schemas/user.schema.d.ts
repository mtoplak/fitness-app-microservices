import { Document } from 'mongoose';
export type UserRole = 'admin' | 'trainer' | 'member';
export declare class User extends Document {
    email: string;
    passwordHash: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    address?: string;
    membershipId?: string;
    role: UserRole;
}
export declare const UserSchema: import("mongoose").Schema<User, import("mongoose").Model<User, any, any, any, Document<unknown, any, User, any, {}> & User & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, User, Document<unknown, {}, import("mongoose").FlatRecord<User>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<User> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
