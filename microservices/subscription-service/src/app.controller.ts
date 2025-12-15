import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AppService } from './app.service';
import { PurchaseSubscriptionDto } from './dto/purchase-subscription.dto';
import { RenewSubscriptionDto } from './dto/renew-subscription.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import {
  SubscriptionResponseDto,
  PlanResponseDto,
  PaymentHistoryDto,
} from './dto/response.dto';
import { Public } from './auth/public.decorator';
import { Roles } from './auth/roles.decorator';
import { CurrentUser } from './auth/user.decorator';
import type { RequestUser } from './auth/user.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // ========== SUBSCRIPTION PLANS ==========

  // Pridobi vse pakete naročnin
  @Public()
  @Get('plans')
  async getPlans(@Query('activeOnly') activeOnly?: string): Promise<PlanResponseDto[]> {
    return this.appService.getPlans(activeOnly === 'true');
  }

  // Pridobi posamezen paket
  @Public()
  @Get('plans/:id')
  async getPlanById(@Param('id') id: string): Promise<PlanResponseDto> {
    return this.appService.getPlanById(id);
  }

  // Ustvari nov paket (admin)
  @Roles('admin')
  @Post('plans')
  @HttpCode(HttpStatus.CREATED)
  async createPlan(@Body() createPlanDto: CreatePlanDto): Promise<PlanResponseDto> {
    return this.appService.createPlan(createPlanDto);
  }

  // Posodobi paket (admin)
  @Roles('admin')
  @Put('plans/:id')
  async updatePlan(
    @Param('id') id: string,
    @Body() updatePlanDto: Partial<CreatePlanDto>,
  ): Promise<PlanResponseDto> {
    return this.appService.updatePlan(id, updatePlanDto);
  }

  // ========== SUBSCRIPTIONS ==========

  // Nakup naročnine
  @Post('subscriptions')
  @HttpCode(HttpStatus.CREATED)
  async purchaseSubscription(
    @Body() purchaseDto: PurchaseSubscriptionDto,
    @CurrentUser() user: RequestUser,
  ): Promise<SubscriptionResponseDto> {
    // Use authenticated user's ID if not provided
    if (!purchaseDto.userId && user) {
      purchaseDto.userId = user.userId;
    }
    return this.appService.purchaseSubscription(purchaseDto);
  }

  // Pridobi aktivno naročnino uporabnika
  @Get('subscriptions/user/:userId')
  async getUserSubscription(
    @Param('userId') userId: string,
  ): Promise<SubscriptionResponseDto | null> {
    return this.appService.getUserActiveSubscription(userId);
  }

  // Pridobi vse naročnine uporabnika
  @Get('subscriptions/user/:userId/all')
  async getUserSubscriptions(
    @Param('userId') userId: string,
  ): Promise<SubscriptionResponseDto[]> {
    return this.appService.getUserSubscriptions(userId);
  }

  // Pridobi naročnino po ID
  @Get('subscriptions/:id')
  async getSubscriptionById(
    @Param('id') id: string,
  ): Promise<SubscriptionResponseDto> {
    return this.appService.getSubscriptionById(id);
  }

  // Podaljšanje naročnine
  @Post('subscriptions/:id/renew')
  async renewSubscription(
    @Param('id') id: string,
    @Body() renewDto: RenewSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.appService.renewSubscription(id, renewDto);
  }

  // Preklic naročnine
  @Post('subscriptions/:id/cancel')
  async cancelSubscription(
    @Param('id') id: string,
    @Body() cancelDto: CancelSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.appService.cancelSubscription(id, cancelDto);
  }

  // Ponovno aktiviraj prekinjeno naročnino
  @Post('subscriptions/:id/reactivate')
  async reactivateSubscription(
    @Param('id') id: string,
  ): Promise<SubscriptionResponseDto> {
    return this.appService.reactivateSubscription(id);
  }

  // Preveri status naročnine
  @Get('subscriptions/:id/status')
  async checkSubscriptionStatus(@Param('id') id: string): Promise<{
    status: string;
    isActive: boolean;
    daysRemaining: number;
    expiresAt: Date;
  }> {
    return this.appService.checkSubscriptionStatus(id);
  }

  // ========== PAYMENT HISTORY ==========

  // Zgodovina plačil uporabnika
  @Get('payments/user/:userId')
  async getUserPaymentHistory(
    @Param('userId') userId: string,
  ): Promise<PaymentHistoryDto[]> {
    return this.appService.getUserPaymentHistory(userId);
  }

  // Zgodovina plačil za naročnino
  @Get('payments/subscription/:subscriptionId')
  async getSubscriptionPaymentHistory(
    @Param('subscriptionId') subscriptionId: string,
  ): Promise<PaymentHistoryDto[]> {
    return this.appService.getSubscriptionPaymentHistory(subscriptionId);
  }

  // Vse naročnine, ki potečejo kmalu (admin)
  @Roles('admin')
  @Get('admin/expiring-subscriptions')
  async getExpiringSubscriptions(
    @Query('days') days: string = '7',
  ): Promise<SubscriptionResponseDto[]> {
    return this.appService.getExpiringSubscriptions(parseInt(days));
  }
}
