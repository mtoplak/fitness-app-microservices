import { Document, Schema as MongooseSchema } from 'mongoose';
export type PaymentDocument = Payment & Document;
export declare class Payment {
    subscriptionId: string;
    userId: string;
    amount: number;
    paymentMethod: string;
    status: string;
    transactionId: string;
    paymentDate: Date;
    failureReason: string;
    metadata: Record<string, any>;
}
export declare const PaymentSchema: MongooseSchema<Payment, import("mongoose").Model<Payment, any, any, any, Document<unknown, any, Payment, any, {}> & Payment & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Payment, Document<unknown, {}, import("mongoose").FlatRecord<Payment>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Payment> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
