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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
const purchase_subscription_dto_1 = require("./dto/purchase-subscription.dto");
const renew_subscription_dto_1 = require("./dto/renew-subscription.dto");
const cancel_subscription_dto_1 = require("./dto/cancel-subscription.dto");
const create_plan_dto_1 = require("./dto/create-plan.dto");
let AppController = class AppController {
    appService;
    constructor(appService) {
        this.appService = appService;
    }
    getHello() {
        return this.appService.getHello();
    }
    async getPlans(activeOnly) {
        return this.appService.getPlans(activeOnly === 'true');
    }
    async getPlanById(id) {
        return this.appService.getPlanById(id);
    }
    async createPlan(createPlanDto) {
        return this.appService.createPlan(createPlanDto);
    }
    async updatePlan(id, updatePlanDto) {
        return this.appService.updatePlan(id, updatePlanDto);
    }
    async purchaseSubscription(purchaseDto) {
        return this.appService.purchaseSubscription(purchaseDto);
    }
    async getUserSubscription(userId) {
        return this.appService.getUserActiveSubscription(userId);
    }
    async getUserSubscriptions(userId) {
        return this.appService.getUserSubscriptions(userId);
    }
    async getSubscriptionById(id) {
        return this.appService.getSubscriptionById(id);
    }
    async renewSubscription(id, renewDto) {
        return this.appService.renewSubscription(id, renewDto);
    }
    async cancelSubscription(id, cancelDto) {
        return this.appService.cancelSubscription(id, cancelDto);
    }
    async reactivateSubscription(id) {
        return this.appService.reactivateSubscription(id);
    }
    async checkSubscriptionStatus(id) {
        return this.appService.checkSubscriptionStatus(id);
    }
    async getUserPaymentHistory(userId) {
        return this.appService.getUserPaymentHistory(userId);
    }
    async getSubscriptionPaymentHistory(subscriptionId) {
        return this.appService.getSubscriptionPaymentHistory(subscriptionId);
    }
    async getExpiringSubscriptions(days = '7') {
        return this.appService.getExpiringSubscriptions(parseInt(days));
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.Get)('plans'),
    __param(0, (0, common_1.Query)('activeOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getPlans", null);
__decorate([
    (0, common_1.Get)('plans/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getPlanById", null);
__decorate([
    (0, common_1.Post)('plans'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_plan_dto_1.CreatePlanDto]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "createPlan", null);
__decorate([
    (0, common_1.Put)('plans/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "updatePlan", null);
__decorate([
    (0, common_1.Post)('subscriptions'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [purchase_subscription_dto_1.PurchaseSubscriptionDto]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "purchaseSubscription", null);
__decorate([
    (0, common_1.Get)('subscriptions/user/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getUserSubscription", null);
__decorate([
    (0, common_1.Get)('subscriptions/user/:userId/all'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getUserSubscriptions", null);
__decorate([
    (0, common_1.Get)('subscriptions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getSubscriptionById", null);
__decorate([
    (0, common_1.Post)('subscriptions/:id/renew'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, renew_subscription_dto_1.RenewSubscriptionDto]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "renewSubscription", null);
__decorate([
    (0, common_1.Post)('subscriptions/:id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, cancel_subscription_dto_1.CancelSubscriptionDto]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "cancelSubscription", null);
__decorate([
    (0, common_1.Post)('subscriptions/:id/reactivate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "reactivateSubscription", null);
__decorate([
    (0, common_1.Get)('subscriptions/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "checkSubscriptionStatus", null);
__decorate([
    (0, common_1.Get)('payments/user/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getUserPaymentHistory", null);
__decorate([
    (0, common_1.Get)('payments/subscription/:subscriptionId'),
    __param(0, (0, common_1.Param)('subscriptionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getSubscriptionPaymentHistory", null);
__decorate([
    (0, common_1.Get)('admin/expiring-subscriptions'),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getExpiringSubscriptions", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService])
], AppController);
//# sourceMappingURL=app.controller.js.map