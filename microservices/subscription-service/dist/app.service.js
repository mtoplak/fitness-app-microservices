"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const schedule_1 = require("@nestjs/schedule");
const subscription_schema_1 = require("./schemas/subscription.schema");
const subscription_plan_schema_1 = require("./schemas/subscription-plan.schema");
const payment_schema_1 = require("./schemas/payment.schema");
let AppService = class AppService {
    subscriptionModel;
    planModel;
    paymentModel;
    constructor(subscriptionModel, planModel, paymentModel) {
        this.subscriptionModel = subscriptionModel;
        this.planModel = planModel;
        this.paymentModel = paymentModel;
    }
    getHello() {
        return 'Subscription Service is running!';
    }
    async getPlans(activeOnly = true) {
        const query = activeOnly ? { isActive: true } : {};
        const plans = await this.planModel.find(query).sort({ price: 1 }).exec();
        return plans.map((plan) => this.mapPlanToDto(plan));
    }
    async getPlanById(id) {
        const plan = await this.planModel.findById(id).exec();
        if (!plan) {
            throw new common_1.NotFoundException('Subscription plan not found');
        }
        return this.mapPlanToDto(plan);
    }
    async createPlan(createPlanDto) {
        const plan = new this.planModel(createPlanDto);
        await plan.save();
        return this.mapPlanToDto(plan);
    }
    async updatePlan(id, updatePlanDto) {
        const plan = await this.planModel.findById(id).exec();
        if (!plan) {
            throw new common_1.NotFoundException('Subscription plan not found');
        }
        Object.assign(plan, updatePlanDto);
        await plan.save();
        return this.mapPlanToDto(plan);
    }
    async purchaseSubscription(purchaseDto) {
        const { userId, planId, paymentMethod } = purchaseDto;
        const existingSubscription = await this.subscriptionModel
            .findOne({
            userId,
            status: 'active',
            endDate: { $gt: new Date() },
        })
            .exec();
        if (existingSubscription) {
            throw new common_1.ConflictException('User already has an active subscription');
        }
        const plan = await this.planModel.findById(planId).exec();
        if (!plan) {
            throw new common_1.NotFoundException('Subscription plan not found');
        }
        if (!plan.isActive) {
            throw new common_1.BadRequestException('This subscription plan is not available');
        }
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + plan.durationDays);
        const subscription = new this.subscriptionModel({
            userId,
            planId,
            status: 'active',
            startDate,
            endDate,
            autoRenew: true,
            renewalCount: 0,
        });
        await subscription.save();
        await this.createPayment(subscription._id.toString(), userId, plan.price, paymentMethod);
        return this.mapSubscriptionToDto(subscription, plan ?? undefined);
    }
    async renewSubscription(subscriptionId, renewDto) {
        const subscription = await this.subscriptionModel
            .findById(subscriptionId)
            .exec();
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        if (subscription.status === 'cancelled') {
            throw new common_1.BadRequestException('Cannot renew cancelled subscription. Please reactivate first.');
        }
        const plan = await this.planModel.findById(subscription.planId).exec();
        if (!plan) {
            throw new common_1.NotFoundException('Subscription plan not found');
        }
        const newEndDate = new Date(Math.max(subscription.endDate.getTime(), Date.now()));
        newEndDate.setDate(newEndDate.getDate() + plan.durationDays);
        subscription.endDate = newEndDate;
        subscription.status = 'active';
        subscription.lastRenewalDate = new Date();
        subscription.renewalCount += 1;
        await subscription.save();
        await this.createPayment(subscription._id.toString(), subscription.userId, plan.price, renewDto.paymentMethod);
        return this.mapSubscriptionToDto(subscription, plan ?? undefined);
    }
    async cancelSubscription(subscriptionId, cancelDto) {
        const subscription = await this.subscriptionModel
            .findById(subscriptionId)
            .exec();
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        if (subscription.status === 'cancelled') {
            throw new common_1.BadRequestException('Subscription is already cancelled');
        }
        subscription.status = 'cancelled';
        subscription.autoRenew = false;
        subscription.cancelledAt = new Date();
        if (cancelDto.reason) {
            subscription.cancelReason = cancelDto.reason;
        }
        await subscription.save();
        const plan = await this.planModel.findById(subscription.planId).exec();
        return this.mapSubscriptionToDto(subscription, plan ?? undefined);
    }
    async reactivateSubscription(subscriptionId) {
        const subscription = await this.subscriptionModel
            .findById(subscriptionId)
            .exec();
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        if (subscription.status !== 'cancelled') {
            throw new common_1.BadRequestException('Only cancelled subscriptions can be reactivated');
        }
        if (subscription.endDate < new Date()) {
            throw new common_1.BadRequestException('Subscription has expired. Please purchase a new subscription.');
        }
        subscription.status = 'active';
        subscription.autoRenew = true;
        subscription.cancelledAt = undefined;
        subscription.cancelReason = undefined;
        await subscription.save();
        const plan = await this.planModel.findById(subscription.planId).exec();
        return this.mapSubscriptionToDto(subscription, plan ?? undefined);
    }
    async getUserActiveSubscription(userId) {
        const subscription = await this.subscriptionModel
            .findOne({
            userId,
            status: 'active',
            endDate: { $gt: new Date() },
        })
            .exec();
        if (!subscription) {
            return null;
        }
        const plan = await this.planModel.findById(subscription.planId).exec();
        return this.mapSubscriptionToDto(subscription, plan ?? undefined);
    }
    async getUserSubscriptions(userId) {
        const subscriptions = await this.subscriptionModel
            .find({ userId })
            .sort({ startDate: -1 })
            .exec();
        const subscriptionsWithPlans = await Promise.all(subscriptions.map(async (subscription) => {
            const plan = await this.planModel.findById(subscription.planId).exec();
            return this.mapSubscriptionToDto(subscription, plan ?? undefined);
        }));
        return subscriptionsWithPlans;
    }
    async getSubscriptionById(id) {
        const subscription = await this.subscriptionModel.findById(id).exec();
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        const plan = await this.planModel.findById(subscription.planId).exec();
        return this.mapSubscriptionToDto(subscription, plan ?? undefined);
    }
    async checkSubscriptionStatus(id) {
        const subscription = await this.subscriptionModel.findById(id).exec();
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        const now = new Date();
        const daysRemaining = Math.ceil((subscription.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
            status: subscription.status,
            isActive: subscription.status === 'active' && subscription.endDate > now,
            daysRemaining: Math.max(0, daysRemaining),
            expiresAt: subscription.endDate,
        };
    }
    async createPayment(subscriptionId, userId, amount, paymentMethod) {
        const payment = new this.paymentModel({
            subscriptionId,
            userId,
            amount,
            paymentMethod,
            status: 'completed',
            transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            paymentDate: new Date(),
        });
        await payment.save();
        return payment;
    }
    async getUserPaymentHistory(userId) {
        const payments = await this.paymentModel
            .find({ userId })
            .sort({ paymentDate: -1 })
            .exec();
        return payments.map((payment) => this.mapPaymentToDto(payment));
    }
    async getSubscriptionPaymentHistory(subscriptionId) {
        const payments = await this.paymentModel
            .find({ subscriptionId })
            .sort({ paymentDate: -1 })
            .exec();
        return payments.map((payment) => this.mapPaymentToDto(payment));
    }
    async getExpiringSubscriptions(days = 7) {
        const now = new Date();
        const expiryDate = new Date(now);
        expiryDate.setDate(expiryDate.getDate() + days);
        const subscriptions = await this.subscriptionModel
            .find({
            status: 'active',
            endDate: {
                $gte: now,
                $lte: expiryDate,
            },
        })
            .sort({ endDate: 1 })
            .exec();
        const subscriptionsWithPlans = await Promise.all(subscriptions.map(async (subscription) => {
            const plan = await this.planModel.findById(subscription.planId).exec();
            return this.mapSubscriptionToDto(subscription, plan ?? undefined);
        }));
        return subscriptionsWithPlans;
    }
    async markExpiredSubscriptions() {
        const now = new Date();
        const result = await this.subscriptionModel
            .updateMany({
            status: 'active',
            endDate: { $lt: now },
        }, {
            $set: { status: 'expired' },
        })
            .exec();
        console.log(`Marked ${result.modifiedCount} subscriptions as expired`);
    }
    mapSubscriptionToDto(subscription, plan) {
        return {
            id: subscription._id.toString(),
            userId: subscription.userId,
            planId: subscription.planId,
            planName: plan?.name,
            status: subscription.status,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            autoRenew: subscription.autoRenew,
            cancelledAt: subscription.cancelledAt,
            cancelReason: subscription.cancelReason,
            createdAt: subscription.createdAt,
            updatedAt: subscription.updatedAt,
        };
    }
    mapPlanToDto(plan) {
        return {
            id: plan._id.toString(),
            name: plan.name,
            description: plan.description,
            price: plan.price,
            durationDays: plan.durationDays,
            accessLevel: plan.accessLevel,
            isActive: plan.isActive,
            features: plan.features,
        };
    }
    mapPaymentToDto(payment) {
        return {
            id: payment._id.toString(),
            subscriptionId: payment.subscriptionId,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            status: payment.status,
            transactionId: payment.transactionId,
            paymentDate: payment.paymentDate,
        };
    }
};
exports.AppService = AppService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppService.prototype, "markExpiredSubscriptions", null);
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(subscription_schema_1.Subscription.name)),
    __param(1, (0, mongoose_1.InjectModel)(subscription_plan_schema_1.SubscriptionPlan.name)),
    __param(2, (0, mongoose_1.InjectModel)(payment_schema_1.Payment.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], AppService);
//# sourceMappingURL=app.service.js.map