import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Subscription, SubscriptionDocument } from './schemas/subscription.schema';
import {
  SubscriptionPlan,
  SubscriptionPlanDocument,
} from './schemas/subscription-plan.schema';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { PurchaseSubscriptionDto } from './dto/purchase-subscription.dto';
import { RenewSubscriptionDto } from './dto/renew-subscription.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import {
  SubscriptionResponseDto,
  PlanResponseDto,
  PaymentHistoryDto,
} from './dto/response.dto';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(SubscriptionPlan.name)
    private planModel: Model<SubscriptionPlanDocument>,
    @InjectModel(Payment.name)
    private paymentModel: Model<PaymentDocument>,
  ) {}

  getHello(): string {
    return 'Subscription Service is running!';
  }

  // ========== SUBSCRIPTION PLANS ==========

  async getPlans(activeOnly: boolean = true): Promise<PlanResponseDto[]> {
    const query = activeOnly ? { isActive: true } : {};
    const plans = await this.planModel.find(query).sort({ price: 1 }).exec();
    return plans.map((plan) => this.mapPlanToDto(plan));
  }

  async getPlanById(id: string): Promise<PlanResponseDto> {
    const plan = await this.planModel.findById(id).exec();
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }
    return this.mapPlanToDto(plan);
  }

  async createPlan(createPlanDto: CreatePlanDto): Promise<PlanResponseDto> {
    const plan = new this.planModel(createPlanDto);
    await plan.save();
    return this.mapPlanToDto(plan);
  }

  async updatePlan(
    id: string,
    updatePlanDto: Partial<CreatePlanDto>,
  ): Promise<PlanResponseDto> {
    const plan = await this.planModel.findById(id).exec();
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    Object.assign(plan, updatePlanDto);
    await plan.save();
    return this.mapPlanToDto(plan);
  }

  // ========== SUBSCRIPTIONS ==========

  async purchaseSubscription(
    purchaseDto: PurchaseSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    const { userId, planId, paymentMethod } = purchaseDto;

    // Preveri, če uporabnik že ima aktivno naročnino
    const existingSubscription = await this.subscriptionModel
      .findOne({
        userId,
        status: 'active',
        endDate: { $gt: new Date() },
      })
      .exec();

    if (existingSubscription) {
      throw new ConflictException('User already has an active subscription');
    }

    // Pridobi paket
    const plan = await this.planModel.findById(planId).exec();
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    if (!plan.isActive) {
      throw new BadRequestException('This subscription plan is not available');
    }

    // Ustvari naročnino
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

    // Zabeleži plačilo
    await this.createPayment(
      subscription._id.toString(),
      userId,
      plan.price,
      paymentMethod,
    );

    return this.mapSubscriptionToDto(subscription, plan);
  }

  async renewSubscription(
    subscriptionId: string,
    renewDto: RenewSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionModel
      .findById(subscriptionId)
      .exec();

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === 'cancelled') {
      throw new BadRequestException(
        'Cannot renew cancelled subscription. Please reactivate first.',
      );
    }

    const plan = await this.planModel.findById(subscription.planId).exec();
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    // Podaljšaj naročnino
    const newEndDate = new Date(
      Math.max(subscription.endDate.getTime(), Date.now()),
    );
    newEndDate.setDate(newEndDate.getDate() + plan.durationDays);

    subscription.endDate = newEndDate;
    subscription.status = 'active';
    subscription.lastRenewalDate = new Date();
    subscription.renewalCount += 1;

    await subscription.save();

    // Zabeleži plačilo
    await this.createPayment(
      subscription._id.toString(),
      subscription.userId,
      plan.price,
      renewDto.paymentMethod,
    );

    return this.mapSubscriptionToDto(subscription, plan);
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelDto: CancelSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionModel
      .findById(subscriptionId)
      .exec();

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === 'cancelled') {
      throw new BadRequestException('Subscription is already cancelled');
    }

    subscription.status = 'cancelled';
    subscription.autoRenew = false;
    subscription.cancelledAt = new Date();
    if (cancelDto.reason) {
      subscription.cancelReason = cancelDto.reason;
    }

    await subscription.save();

    const plan = await this.planModel.findById(subscription.planId).exec();
    return this.mapSubscriptionToDto(subscription, plan);
  }

  async reactivateSubscription(
    subscriptionId: string,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionModel
      .findById(subscriptionId)
      .exec();

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== 'cancelled') {
      throw new BadRequestException('Only cancelled subscriptions can be reactivated');
    }

    // Če je naročnina že potekla, uporabnik mora kupiti novo
    if (subscription.endDate < new Date()) {
      throw new BadRequestException(
        'Subscription has expired. Please purchase a new subscription.',
      );
    }

    subscription.status = 'active';
    subscription.autoRenew = true;
    subscription.cancelledAt = null;
    subscription.cancelReason = null;

    await subscription.save();

    const plan = await this.planModel.findById(subscription.planId).exec();
    return this.mapSubscriptionToDto(subscription, plan);
  }

  async getUserActiveSubscription(
    userId: string,
  ): Promise<SubscriptionResponseDto | null> {
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
    return this.mapSubscriptionToDto(subscription, plan);
  }

  async getUserSubscriptions(userId: string): Promise<SubscriptionResponseDto[]> {
    const subscriptions = await this.subscriptionModel
      .find({ userId })
      .sort({ startDate: -1 })
      .exec();

    const subscriptionsWithPlans = await Promise.all(
      subscriptions.map(async (subscription) => {
        const plan = await this.planModel.findById(subscription.planId).exec();
        return this.mapSubscriptionToDto(subscription, plan);
      }),
    );

    return subscriptionsWithPlans;
  }

  async getSubscriptionById(id: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionModel.findById(id).exec();
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const plan = await this.planModel.findById(subscription.planId).exec();
    return this.mapSubscriptionToDto(subscription, plan);
  }

  async checkSubscriptionStatus(id: string): Promise<{
    status: string;
    isActive: boolean;
    daysRemaining: number;
    expiresAt: Date;
  }> {
    const subscription = await this.subscriptionModel.findById(id).exec();
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const now = new Date();
    const daysRemaining = Math.ceil(
      (subscription.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      status: subscription.status,
      isActive: subscription.status === 'active' && subscription.endDate > now,
      daysRemaining: Math.max(0, daysRemaining),
      expiresAt: subscription.endDate,
    };
  }

  // ========== PAYMENT HISTORY ==========

  async createPayment(
    subscriptionId: string,
    userId: string,
    amount: number,
    paymentMethod: string,
  ): Promise<Payment> {
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

  async getUserPaymentHistory(userId: string): Promise<PaymentHistoryDto[]> {
    const payments = await this.paymentModel
      .find({ userId })
      .sort({ paymentDate: -1 })
      .exec();

    return payments.map((payment) => this.mapPaymentToDto(payment));
  }

  async getSubscriptionPaymentHistory(
    subscriptionId: string,
  ): Promise<PaymentHistoryDto[]> {
    const payments = await this.paymentModel
      .find({ subscriptionId })
      .sort({ paymentDate: -1 })
      .exec();

    return payments.map((payment) => this.mapPaymentToDto(payment));
  }

  // ========== ADMIN ==========

  async getExpiringSubscriptions(days: number = 7): Promise<SubscriptionResponseDto[]> {
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

    const subscriptionsWithPlans = await Promise.all(
      subscriptions.map(async (subscription) => {
        const plan = await this.planModel.findById(subscription.planId).exec();
        return this.mapSubscriptionToDto(subscription, plan);
      }),
    );

    return subscriptionsWithPlans;
  }

  // ========== CRON JOBS ==========

  // Avtomatsko označevanje potečenih naročnin
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async markExpiredSubscriptions() {
    const now = new Date();
    const result = await this.subscriptionModel
      .updateMany(
        {
          status: 'active',
          endDate: { $lt: now },
        },
        {
          $set: { status: 'expired' },
        },
      )
      .exec();

    console.log(`Marked ${result.modifiedCount} subscriptions as expired`);
  }

  // ========== HELPER METHODS ==========

  private mapSubscriptionToDto(
    subscription: SubscriptionDocument,
    plan?: SubscriptionPlanDocument,
  ): SubscriptionResponseDto {
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

  private mapPlanToDto(plan: SubscriptionPlanDocument): PlanResponseDto {
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

  private mapPaymentToDto(payment: PaymentDocument): PaymentHistoryDto {
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
}
