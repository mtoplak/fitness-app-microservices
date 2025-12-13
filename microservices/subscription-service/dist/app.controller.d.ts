import { AppService } from './app.service';
import { PurchaseSubscriptionDto } from './dto/purchase-subscription.dto';
import { RenewSubscriptionDto } from './dto/renew-subscription.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { SubscriptionResponseDto, PlanResponseDto, PaymentHistoryDto } from './dto/response.dto';
import type { RequestUser } from './auth/user.decorator';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHello(): string;
    getPlans(activeOnly?: string): Promise<PlanResponseDto[]>;
    getPlanById(id: string): Promise<PlanResponseDto>;
    createPlan(createPlanDto: CreatePlanDto): Promise<PlanResponseDto>;
    updatePlan(id: string, updatePlanDto: Partial<CreatePlanDto>): Promise<PlanResponseDto>;
    purchaseSubscription(purchaseDto: PurchaseSubscriptionDto, user: RequestUser): Promise<SubscriptionResponseDto>;
    getUserSubscription(userId: string): Promise<SubscriptionResponseDto | null>;
    getUserSubscriptions(userId: string): Promise<SubscriptionResponseDto[]>;
    getSubscriptionById(id: string): Promise<SubscriptionResponseDto>;
    renewSubscription(id: string, renewDto: RenewSubscriptionDto): Promise<SubscriptionResponseDto>;
    cancelSubscription(id: string, cancelDto: CancelSubscriptionDto): Promise<SubscriptionResponseDto>;
    reactivateSubscription(id: string): Promise<SubscriptionResponseDto>;
    checkSubscriptionStatus(id: string): Promise<{
        status: string;
        isActive: boolean;
        daysRemaining: number;
        expiresAt: Date;
    }>;
    getUserPaymentHistory(userId: string): Promise<PaymentHistoryDto[]>;
    getSubscriptionPaymentHistory(subscriptionId: string): Promise<PaymentHistoryDto[]>;
    getExpiringSubscriptions(days?: string): Promise<SubscriptionResponseDto[]>;
}
