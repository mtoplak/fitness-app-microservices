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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AppService } from './app.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ProposeScheduleDto } from './dto/propose-schedule.dto';
import {
  ScheduleResponseDto,
  ConflictCheckDto,
} from './dto/schedule-response.dto';
import { Public } from './auth/public.decorator';
import { Roles } from './auth/roles.decorator';

@ApiTags('Schedules')
@ApiBearerAuth()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is running' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('schedules')
  @ApiOperation({ summary: 'Get all workout schedules with optional filters' })
  @ApiQuery({
    name: 'trainerId',
    required: false,
    description: 'Filter by trainer ID',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start date filter (ISO string)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End date filter (ISO string)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by workout type',
  })
  @ApiResponse({
    status: 200,
    description: 'List of schedules',
    type: [ScheduleResponseDto],
  })
  async getSchedules(
    @Query('trainerId') trainerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: string,
  ): Promise<ScheduleResponseDto[]> {
    return this.appService.getSchedules({ trainerId, from, to, type });
  }

  @Public()
  @Get('schedules/:id')
  @ApiOperation({ summary: 'Get schedule by ID' })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiResponse({
    status: 200,
    description: 'Schedule found',
    type: ScheduleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async getScheduleById(@Param('id') id: string): Promise<ScheduleResponseDto> {
    return this.appService.getScheduleById(id);
  }

  @Roles('admin')
  @Post('schedules')
  @ApiOperation({ summary: 'Create a new schedule (admin)' })
  @ApiResponse({
    status: 201,
    description: 'Schedule created',
    type: ScheduleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @HttpCode(HttpStatus.CREATED)
  async createSchedule(
    @Body() createScheduleDto: CreateScheduleDto,
  ): Promise<ScheduleResponseDto> {
    return this.appService.createSchedule(createScheduleDto);
  }

  @Roles('admin', 'trainer')
  @Post('schedules/propose')
  @ApiOperation({
    summary: 'Propose a new schedule (trainer, pending approval)',
  })
  @ApiResponse({
    status: 201,
    description: 'Schedule proposal created',
    type: ScheduleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @HttpCode(HttpStatus.CREATED)
  async proposeSchedule(
    @Body() proposeScheduleDto: ProposeScheduleDto,
  ): Promise<ScheduleResponseDto> {
    return this.appService.proposeSchedule(proposeScheduleDto);
  }

  @Roles('admin', 'trainer')
  @Put('schedules/check-conflict')
  @ApiOperation({ summary: 'Check for scheduling conflicts' })
  @ApiResponse({
    status: 200,
    description: 'Conflict check result',
    type: ConflictCheckDto,
  })
  async checkConflict(
    @Body()
    body: {
      trainerId: string;
      scheduledAt: string;
      duration: number;
      excludeId?: string;
    },
  ): Promise<ConflictCheckDto> {
    return this.appService.checkConflict(
      body.trainerId,
      new Date(body.scheduledAt),
      body.duration,
      body.excludeId,
    );
  }

  @Roles('admin')
  @Get('schedules/pending/list')
  @ApiOperation({ summary: 'Get all pending schedules (admin)' })
  @ApiResponse({
    status: 200,
    description: 'List of pending schedules',
    type: [ScheduleResponseDto],
  })
  async getPendingSchedules(): Promise<ScheduleResponseDto[]> {
    return this.appService.getPendingSchedules();
  }

  @Roles('admin')
  @Post('schedules/:id/approve')
  @ApiOperation({ summary: 'Approve a pending schedule (admin)' })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiResponse({
    status: 200,
    description: 'Schedule approved',
    type: ScheduleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async approveSchedule(
    @Param('id') id: string,
    @Body() body: { approvedBy: string },
  ): Promise<ScheduleResponseDto> {
    return this.appService.approveSchedule(id, body.approvedBy);
  }

  @Roles('admin')
  @Post('schedules/:id/reject')
  @ApiOperation({ summary: 'Reject a pending schedule (admin)' })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiResponse({
    status: 200,
    description: 'Schedule rejected',
    type: ScheduleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async rejectSchedule(
    @Param('id') id: string,
    @Body() body: { rejectedBy: string; reason?: string },
  ): Promise<ScheduleResponseDto> {
    return this.appService.rejectSchedule(id, body.rejectedBy, body.reason);
  }

  @Roles('admin', 'trainer')
  @Put('schedules/:id')
  @ApiOperation({ summary: 'Update an existing schedule' })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiResponse({
    status: 200,
    description: 'Schedule updated',
    type: ScheduleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async updateSchedule(
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ): Promise<ScheduleResponseDto> {
    return this.appService.updateSchedule(id, updateScheduleDto);
  }

  @Roles('admin')
  @Delete('schedules/:id')
  @ApiOperation({ summary: 'Delete a schedule' })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiResponse({ status: 200, description: 'Schedule deleted' })
  @HttpCode(HttpStatus.OK)
  async deleteSchedule(@Param('id') id: string): Promise<{ message: string }> {
    return this.appService.deleteSchedule(id);
  }

  // Prekliči urnik (soft delete)
  @Roles('admin', 'trainer')
  @Delete('schedules/:id/cancel')
  @Post('schedules/:id/cancel')
  @ApiOperation({ summary: 'Cancel a schedule (soft delete)' })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiResponse({
    status: 200,
    description: 'Schedule cancelled',
    type: ScheduleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async cancelSchedule(@Param('id') id: string): Promise<ScheduleResponseDto> {
    return this.appService.cancelSchedule(id);
  }
}
