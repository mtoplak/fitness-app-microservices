import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  WorkoutSchedule,
  WorkoutScheduleDocument,
} from './schemas/workout-schedule.schema';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ProposeScheduleDto } from './dto/propose-schedule.dto';
import { ScheduleResponseDto, ConflictCheckDto } from './dto/schedule-response.dto';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(WorkoutSchedule.name)
    private scheduleModel: Model<WorkoutScheduleDocument>,
  ) {}

  getHello(): string {
    return 'Workout Schedule Service is running!';
  }

  // Prikaz urnika z filtriranjem
  async getSchedules(filters: {
    trainerId?: string;
    from?: string;
    to?: string;
    type?: string;
  }): Promise<ScheduleResponseDto[]> {
    const query: any = { approvalStatus: 'approved', status: { $ne: 'cancelled' } };

    if (filters.trainerId) {
      query.trainerId = filters.trainerId;
    }

    if (filters.from || filters.to) {
      query.scheduledAt = {};
      if (filters.from) {
        query.scheduledAt.$gte = new Date(filters.from);
      }
      if (filters.to) {
        query.scheduledAt.$lte = new Date(filters.to);
      }
    }

    if (filters.type) {
      query.type = filters.type;
    }

    const schedules = await this.scheduleModel
      .find(query)
      .sort({ scheduledAt: 1 })
      .exec();

    return schedules.map((schedule) => this.mapToResponseDto(schedule));
  }

  // Pridobi posamezen urnik
  async getScheduleById(id: string): Promise<ScheduleResponseDto> {
    const schedule = await this.scheduleModel.findById(id).exec();

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return this.mapToResponseDto(schedule);
  }

  // Admin kreira nov urnik (direktno odobreno)
  async createSchedule(
    createScheduleDto: CreateScheduleDto,
  ): Promise<ScheduleResponseDto> {
    // Preveri prekrivanje
    const conflict = await this.checkConflict(
      createScheduleDto.trainerId,
      new Date(createScheduleDto.scheduledAt),
      createScheduleDto.duration,
    );

    if (conflict.hasConflict) {
      throw new ConflictException(
        `Schedule conflicts with existing schedule`,
      );
    }

    const schedule = new this.scheduleModel({
      ...createScheduleDto,
      scheduledAt: new Date(createScheduleDto.scheduledAt),
      status: 'active',
      approvalStatus: 'approved',
      currentParticipants: 0,
    });

    await schedule.save();
    return this.mapToResponseDto(schedule);
  }

  // Trener predlaga nov termin
  async proposeSchedule(
    proposeScheduleDto: ProposeScheduleDto,
  ): Promise<ScheduleResponseDto> {
    // Preveri prekrivanje
    const conflict = await this.checkConflict(
      proposeScheduleDto.trainerId,
      new Date(proposeScheduleDto.scheduledAt),
      proposeScheduleDto.duration,
    );

    if (conflict.hasConflict) {
      throw new ConflictException(
        `Schedule conflicts with existing schedule`,
      );
    }

    const schedule = new this.scheduleModel({
      ...proposeScheduleDto,
      scheduledAt: new Date(proposeScheduleDto.scheduledAt),
      status: 'active',
      approvalStatus: 'pending',
      proposedBy: proposeScheduleDto.trainerId,
      currentParticipants: 0,
    });

    await schedule.save();
    return this.mapToResponseDto(schedule);
  }

  // Preveri prekrivanje terminov za določenega trenerja
  async checkConflict(
    trainerId: string,
    scheduledAt: Date,
    duration: number,
    excludeId?: string,
  ): Promise<ConflictCheckDto> {
    const endTime = new Date(scheduledAt.getTime() + duration * 60000);

    const query: any = {
      trainerId,
      approvalStatus: { $in: ['approved', 'pending'] },
      status: 'active',
      $or: [
        // Existing schedule starts during new schedule
        {
          scheduledAt: {
            $gte: scheduledAt,
            $lt: endTime,
          },
        },
        // Existing schedule ends during new schedule
        {
          $expr: {
            $and: [
              { $lte: ['$scheduledAt', scheduledAt] },
              {
                $gt: [
                  {
                    $add: [
                      '$scheduledAt',
                      { $multiply: ['$duration', 60000] },
                    ],
                  },
                  scheduledAt,
                ],
              },
            ],
          },
        },
      ],
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const conflictingSchedules = await this.scheduleModel.find(query).exec();

    return {
      hasConflict: conflictingSchedules.length > 0,
      conflictingSchedules: conflictingSchedules.map((schedule) => ({
        id: schedule._id.toString(),
        name: schedule.name,
        scheduledAt: schedule.scheduledAt,
        duration: schedule.duration,
        trainerId: schedule.trainerId,
      })),
    };
  }

  // Pridobi termine čakajoče na odobritev
  async getPendingSchedules(): Promise<ScheduleResponseDto[]> {
    const schedules = await this.scheduleModel
      .find({ approvalStatus: 'pending' })
      .sort({ scheduledAt: 1 })
      .exec();

    return schedules.map((schedule) => this.mapToResponseDto(schedule));
  }

  // Odobri predlagani termin
  async approveSchedule(
    id: string,
    approvedBy: string,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.scheduleModel.findById(id).exec();

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (schedule.approvalStatus !== 'pending') {
      throw new BadRequestException('Schedule is not pending approval');
    }

    // Ponovno preveri prekrivanje
    const conflict = await this.checkConflict(
      schedule.trainerId,
      schedule.scheduledAt,
      schedule.duration,
      id,
    );

    if (conflict.hasConflict) {
      throw new ConflictException(
        'Schedule conflicts with an existing approved schedule',
      );
    }

    schedule.approvalStatus = 'approved';
    schedule.approvedBy = approvedBy;
    schedule.approvedAt = new Date();

    await schedule.save();
    return this.mapToResponseDto(schedule);
  }

  // Zavrni predlagani termin
  async rejectSchedule(
    id: string,
    rejectedBy: string,
    reason?: string,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.scheduleModel.findById(id).exec();

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (schedule.approvalStatus !== 'pending') {
      throw new BadRequestException('Schedule is not pending approval');
    }

    schedule.approvalStatus = 'rejected';
    schedule.rejectedBy = rejectedBy;
    schedule.rejectedAt = new Date();
    if (reason) {
      schedule.notes = reason;
    }

    await schedule.save();
    return this.mapToResponseDto(schedule);
  }

  // Uredi urnik
  async updateSchedule(
    id: string,
    updateScheduleDto: UpdateScheduleDto,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.scheduleModel.findById(id).exec();

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    // Če se spreminja čas ali trajanje, preveri prekrivanje
    if (updateScheduleDto.scheduledAt || updateScheduleDto.duration || updateScheduleDto.trainerId) {
      const newScheduledAt = updateScheduleDto.scheduledAt
        ? new Date(updateScheduleDto.scheduledAt)
        : schedule.scheduledAt;
      const newDuration = updateScheduleDto.duration || schedule.duration;
      const newTrainerId = updateScheduleDto.trainerId || schedule.trainerId;

      const conflict = await this.checkConflict(
        newTrainerId,
        newScheduledAt,
        newDuration,
        id,
      );

      if (conflict.hasConflict) {
        throw new ConflictException('Schedule update would cause a conflict');
      }
    }

    Object.assign(schedule, updateScheduleDto);
    if (updateScheduleDto.scheduledAt) {
      schedule.scheduledAt = new Date(updateScheduleDto.scheduledAt);
    }

    await schedule.save();
    return this.mapToResponseDto(schedule);
  }

  // Izbriši urnik
  async deleteSchedule(id: string): Promise<{ message: string }> {
    const schedule = await this.scheduleModel.findById(id).exec();

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (schedule.currentParticipants > 0) {
      throw new BadRequestException(
        'Cannot delete schedule with active participants. Cancel it instead.',
      );
    }

    await this.scheduleModel.findByIdAndDelete(id).exec();
    return { message: 'Schedule deleted successfully' };
  }

  // Prekliči urnik (soft delete)
  async cancelSchedule(id: string): Promise<ScheduleResponseDto> {
    const schedule = await this.scheduleModel.findById(id).exec();

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    schedule.status = 'cancelled';
    await schedule.save();

    return this.mapToResponseDto(schedule);
  }

  // Helper metoda za mapping v DTO
  private mapToResponseDto(schedule: WorkoutScheduleDocument): ScheduleResponseDto {
    return {
      id: schedule._id.toString(),
      name: schedule.name,
      description: schedule.description,
      trainerId: schedule.trainerId,
      // @ts-ignore
      memberId: schedule.memberId,
      scheduledAt: schedule.scheduledAt,
      duration: schedule.duration,
      capacity: schedule.capacity,
      currentParticipants: schedule.currentParticipants,
      type: schedule.type,
      status: schedule.status,
      approvalStatus: schedule.approvalStatus,
      notes: schedule.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
