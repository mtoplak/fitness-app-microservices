"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentHistoryDto = exports.PlanResponseDto = exports.SubscriptionResponseDto = void 0;
class SubscriptionResponseDto {
    id;
    userId;
    planId;
    planName;
    status;
    startDate;
    endDate;
    autoRenew;
    cancelledAt;
    cancelReason;
    createdAt;
    updatedAt;
}
exports.SubscriptionResponseDto = SubscriptionResponseDto;
class PlanResponseDto {
    id;
    name;
    description;
    price;
    durationDays;
    accessLevel;
    isActive;
    features;
}
exports.PlanResponseDto = PlanResponseDto;
class PaymentHistoryDto {
    id;
    subscriptionId;
    amount;
    paymentMethod;
    status;
    transactionId;
    paymentDate;
}
exports.PaymentHistoryDto = PaymentHistoryDto;
//# sourceMappingURL=response.dto.js.map