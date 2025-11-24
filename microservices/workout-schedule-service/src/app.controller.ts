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
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ProposeScheduleDto } from './dto/propose-schedule.dto';
import { ScheduleResponseDto, ConflictCheckDto } from './dto/schedule-response.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Prikaz celotnega urnika (za vse uporabnike)
  @Get('schedules')
  async getSchedules(
    @Query('trainerId') trainerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: string,
  ): Promise<ScheduleResponseDto[]> {
    return this.appService.getSchedules({ trainerId, from, to, type });
  }

  // Pridobi posamezen urnik
  @Get('schedules/:id')
  async getScheduleById(@Param('id') id: string): Promise<ScheduleResponseDto> {
    return this.appService.getScheduleById(id);
  }

  // Admin kreira nov urnik (direktno odobreno)
  @Post('schedules')
  @HttpCode(HttpStatus.CREATED)
  async createSchedule(
    @Body() createScheduleDto: CreateScheduleDto,
  ): Promise<ScheduleResponseDto> {
    return this.appService.createSchedule(createScheduleDto);
  }

  // Trener predlaga nov termin (čaka na odobritev)
  @Post('schedules/propose')
  @HttpCode(HttpStatus.CREATED)
  async proposeSchedule(
    @Body() proposeScheduleDto: ProposeScheduleDto,
  ): Promise<ScheduleResponseDto> {
    return this.appService.proposeSchedule(proposeScheduleDto);
  }

  // Preveri prekrivanje terminov
  @Post('schedules/check-conflict')
  async checkConflict(
    @Body() body: { trainerId: string; scheduledAt: string; duration: number; excludeId?: string },
  ): Promise<ConflictCheckDto> {
    return this.appService.checkConflict(
      body.trainerId,
      new Date(body.scheduledAt),
      body.duration,
      body.excludeId,
    );
  }

  // Pridobi vse termine čakajoče na odobritev (za admin)
  @Get('schedules/pending/list')
  async getPendingSchedules(): Promise<ScheduleResponseDto[]> {
    return this.appService.getPendingSchedules();
  }

  // Odobri predlagani termin (admin)
  @Post('schedules/:id/approve')
  async approveSchedule(
    @Param('id') id: string,
    @Body() body: { approvedBy: string },
  ): Promise<ScheduleResponseDto> {
    return this.appService.approveSchedule(id, body.approvedBy);
  }

  // Zavrni predlagani termin (admin)
  @Post('schedules/:id/reject')
  async rejectSchedule(
    @Param('id') id: string,
    @Body() body: { rejectedBy: string; reason?: string },
  ): Promise<ScheduleResponseDto> {
    return this.appService.rejectSchedule(id, body.rejectedBy, body.reason);
  }

  // Uredi obstoječ urnik
  @Put('schedules/:id')
  async updateSchedule(
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ): Promise<ScheduleResponseDto> {
    return this.appService.updateSchedule(id, updateScheduleDto);
  }

  // Izbriši urnik
  @Delete('schedules/:id')
  @HttpCode(HttpStatus.OK)
  async deleteSchedule(@Param('id') id: string): Promise<{ message: string }> {
    return this.appService.deleteSchedule(id);
  }

  // Prekliči urnik (soft delete)
  @Post('schedules/:id/cancel')
  async cancelSchedule(@Param('id') id: string): Promise<ScheduleResponseDto> {
    return this.appService.cancelSchedule(id);
  }
}
