import { Document, Schema as MongooseSchema } from 'mongoose';
export type SubscriptionDocument = Subscription & Document;
export declare class Subscription {
    userId: string;
    planId: string;
    status: string;
    startDate: Date;
    endDate: Date;
    autoRenew: boolean;
    cancelledAt: Date;
    cancelReason: string;
    lastRenewalDate: Date;
    renewalCount: number;
}
export declare const SubscriptionSchema: MongooseSchema<Subscription, import("mongoose").Model<Subscription, any, any, any, Document<unknown, any, Subscription, any, {}> & Subscription & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Subscription, Document<unknown, {}, import("mongoose").FlatRecord<Subscription>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Subscription> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
