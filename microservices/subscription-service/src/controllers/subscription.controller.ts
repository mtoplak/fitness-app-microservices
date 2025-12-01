import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SubscriptionService } from '../services/subscription.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { UserServiceAuthGuard } from '../guards/user-service-auth.guard';
import { GetUser, GetToken } from '../decorators/user.decorator';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
@UseGuards(UserServiceAuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  @ApiResponse({ status: 409, description: 'User already has an active subscription' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @GetUser() user: any,
    @GetToken() token: string,
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ) {
    return this.subscriptionService.create(user._id, createSubscriptionDto, token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiResponse({ status: 200, description: 'Subscription found' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findById(@Param('id') id: string, @GetUser() user: any) {
    return this.subscriptionService.findById(id, user._id, user.role);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all subscriptions for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User subscriptions' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findByUserId(@Param('userId') userId: string, @GetUser() user: any) {
    return this.subscriptionService.findByUserId(userId, user._id, user.role);
  }

  @Get()
  @ApiOperation({ summary: 'Get all subscriptions (Admin only)' })
  @ApiResponse({ status: 200, description: 'All subscriptions' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async findAll(@GetUser() user: any) {
    return this.subscriptionService.findAll(user.role);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update subscription' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiResponse({ status: 200, description: 'Subscription updated' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
    @GetUser() user: any,
  ) {
    return this.subscriptionService.update(id, updateSubscriptionDto, user._id, user.role);
  }

  @Put(':id/renew')
  @ApiOperation({ summary: 'Renew subscription' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiResponse({ status: 200, description: 'Subscription renewed' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async renew(@Param('id') id: string, @GetUser() user: any) {
    return this.subscriptionService.renew(id, user._id, user.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async cancel(@Param('id') id: string, @GetUser() user: any) {
    return this.subscriptionService.cancel(id, user._id, user.role);
  }

  @Delete('user/:userId')
  @ApiOperation({ summary: 'Delete all user subscriptions (Admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User subscriptions deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async deleteByUserId(@Param('userId') userId: string, @GetUser() user: any) {
    return this.subscriptionService.deleteByUserId(userId, user.role);
  }
}
