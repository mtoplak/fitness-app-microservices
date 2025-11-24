import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Trainer } from './schemas/trainer.schema';
import { TrainerBooking } from './schemas/trainer-booking.schema';
import { TrainerAvailability } from './schemas/trainer-availability.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateTrainerDto, UpdateTrainerDto } from './dto/trainer.dto';
import { SetAvailabilityDto } from './dto/availability.dto';
import {
  BookingResponseDto,
  TrainerResponseDto,
  AvailabilitySlot,
} from './dto/response.dto';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(Trainer.name) private trainerModel: Model<Trainer>,
    @InjectModel(TrainerBooking.name)
    private bookingModel: Model<TrainerBooking>,
    @InjectModel(TrainerAvailability.name)
    private availabilityModel: Model<TrainerAvailability>,
    private httpService: HttpService,
  ) {}

  getHello(): string {
    return 'Trainer Booking Service is running!';
  }

  // ========== TRAINERS ==========

  async getTrainers(activeOnly = true): Promise<TrainerResponseDto[]> {
    const filter = activeOnly ? { isActive: true } : {};
    const trainers = await this.trainerModel.find(filter).sort({ rating: -1 });
    return trainers.map((t) => this.mapTrainerToResponse(t));
  }

  async getTrainerById(id: string): Promise<TrainerResponseDto> {
    const trainer = await this.trainerModel.findById(id);
    if (!trainer) {
      throw new NotFoundException(`Trainer with ID ${id} not found`);
    }
    return this.mapTrainerToResponse(trainer);
  }

  async createTrainer(
    createTrainerDto: CreateTrainerDto,
  ): Promise<TrainerResponseDto> {
    const trainer = await this.trainerModel.create(createTrainerDto);
    return this.mapTrainerToResponse(trainer);
  }

  async updateTrainer(
    id: string,
    updateTrainerDto: UpdateTrainerDto,
  ): Promise<TrainerResponseDto> {
    const trainer = await this.trainerModel.findByIdAndUpdate(
      id,
      updateTrainerDto,
      { new: true },
    );
    if (!trainer) {
      throw new NotFoundException(`Trainer with ID ${id} not found`);
    }
    return this.mapTrainerToResponse(trainer);
  }

  // ========== AVAILABILITY ==========

  async setTrainerAvailability(
    trainerId: string,
    availabilityDto: SetAvailabilityDto,
  ): Promise<{ message: string }> {
    const trainer = await this.trainerModel.findById(trainerId);
    if (!trainer) {
      throw new NotFoundException(`Trainer with ID ${trainerId} not found`);
    }

    await this.availabilityModel.findOneAndUpdate(
      { trainerId, date: availabilityDto.date },
      { trainerId, date: availabilityDto.date, timeSlots: availabilityDto.timeSlots },
      { upsert: true, new: true },
    );

    return { message: 'Availability set successfully' };
  }

  async getTrainerAvailability(
    trainerId: string,
    from: Date,
    to: Date,
  ): Promise<AvailabilitySlot[]> {
    const trainer = await this.trainerModel.findById(trainerId);
    if (!trainer) {
      throw new NotFoundException(`Trainer with ID ${trainerId} not found`);
    }

    const availabilities = await this.availabilityModel
      .find({
        trainerId,
        date: { $gte: from, $lte: to },
      })
      .sort({ date: 1 });

    // Preveri obstoječe rezervacije
    const bookings = await this.bookingModel.find({
      trainerId,
      status: { $in: ['confirmed', 'completed'] },
      startTime: { $gte: from, $lte: to },
    });

    const availableSlots: AvailabilitySlot[] = [];

    for (const avail of availabilities) {
      for (const slot of avail.timeSlots) {
        const slotStart = new Date(`${avail.date.toISOString().split('T')[0]}T${slot.startTime}`);
        const slotEnd = new Date(`${avail.date.toISOString().split('T')[0]}T${slot.endTime}`);

        // Preveri ali je termin rezerviran
        const isBooked = bookings.some((booking) => {
          return (
            (booking.startTime >= slotStart && booking.startTime < slotEnd) ||
            (booking.endTime > slotStart && booking.endTime <= slotEnd) ||
            (booking.startTime <= slotStart && booking.endTime >= slotEnd)
          );
        });

        if (!isBooked) {
          availableSlots.push({
            date: avail.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
          });
        }
      }
    }

    return availableSlots;
  }

  // ========== BOOKINGS ==========

  async createBooking(
    createBookingDto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    // 1. Preveri ali trener obstaja
    const trainer = await this.trainerModel.findById(
      createBookingDto.trainerId,
    );
    if (!trainer || !trainer.isActive) {
      throw new NotFoundException('Trainer not found or inactive');
    }

    // 2. Preveri omejitve paketa
    const limits = await this.checkUserBookingLimits(createBookingDto.userId);
    if (!limits.canBook) {
      throw new BadRequestException(
        limits.message || 'You have reached your booking limit',
      );
    }

    // 3. Izračunaj končni čas
    const startTime = new Date(createBookingDto.startTime);
    const endTime = new Date(
      startTime.getTime() + createBookingDto.duration * 60000,
    );

    // 4. Preveri podvajanje terminov (uporabnik)
    const userConflict = await this.bookingModel.findOne({
      userId: createBookingDto.userId,
      status: { $in: ['confirmed', 'completed'] },
      $or: [
        {
          startTime: { $gte: startTime, $lt: endTime },
        },
        {
          endTime: { $gt: startTime, $lte: endTime },
        },
        {
          startTime: { $lte: startTime },
          endTime: { $gte: endTime },
        },
      ],
    });

    if (userConflict) {
      throw new ConflictException('You already have a booking at this time');
    }

    // 5. Preveri podvajanje terminov (trener)
    const trainerConflict = await this.bookingModel.findOne({
      trainerId: createBookingDto.trainerId,
      status: { $in: ['confirmed', 'completed'] },
      $or: [
        {
          startTime: { $gte: startTime, $lt: endTime },
        },
        {
          endTime: { $gt: startTime, $lte: endTime },
        },
        {
          startTime: { $lte: startTime },
          endTime: { $gte: endTime },
        },
      ],
    });

    if (trainerConflict) {
      throw new ConflictException('Trainer is not available at this time');
    }

    // 6. Ustvari rezervacijo
    const booking = await this.bookingModel.create({
      userId: createBookingDto.userId,
      trainerId: createBookingDto.trainerId,
      startTime,
      endTime,
      duration: createBookingDto.duration,
      status: 'confirmed',
      notes: createBookingDto.notes,
    });

    // 7. Posodobi število sej trenerja
    await this.trainerModel.findByIdAndUpdate(createBookingDto.trainerId, {
      $inc: { totalSessions: 1 },
    });

    return this.mapBookingToResponse(booking, trainer);
  }

  async getUserBookings(
    userId: string,
    status?: string,
  ): Promise<BookingResponseDto[]> {
    const filter: any = { userId };
    if (status) {
      filter.status = status;
    }

    const bookings = await this.bookingModel
      .find(filter)
      .sort({ startTime: -1 });

    const trainerIds = [...new Set(bookings.map((b) => b.trainerId))];
    const trainers = await this.trainerModel.find({ _id: { $in: trainerIds } });
    const trainerMap = new Map(trainers.map((t) => [t._id.toString(), t]));

    return bookings.map((booking) => {
      const trainer = trainerMap.get(booking.trainerId.toString());
      return this.mapBookingToResponse(booking, trainer);
    });
  }

  async getTrainerBookings(
    trainerId: string,
    from?: Date,
    to?: Date,
  ): Promise<BookingResponseDto[]> {
    const filter: any = { trainerId };

    if (from && to) {
      filter.startTime = { $gte: from, $lte: to };
    } else if (from) {
      filter.startTime = { $gte: from };
    } else if (to) {
      filter.startTime = { $lte: to };
    }

    const bookings = await this.bookingModel.find(filter).sort({ startTime: 1 });
    const trainer = await this.trainerModel.findById(trainerId);

    return bookings.map((booking) =>
      this.mapBookingToResponse(booking, trainer),
    );
  }

  async getBookingById(id: string): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(id);
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    const trainer = await this.trainerModel.findById(booking.trainerId);
    return this.mapBookingToResponse(booking, trainer);
  }

  async cancelBooking(
    id: string,
    reason?: string,
  ): Promise<{ message: string }> {
    const booking = await this.bookingModel.findById(id);
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    if (booking.status === 'cancelled') {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.status === 'completed') {
      throw new BadRequestException('Cannot cancel completed booking');
    }

    // Preveri časovno omejitev (24 ur vnaprej)
    const now = new Date();
    const hoursDifference =
      (booking.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDifference < 24) {
      throw new BadRequestException(
        'Bookings must be cancelled at least 24 hours in advance',
      );
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason;
    await booking.save();

    return { message: 'Booking cancelled successfully' };
  }

  async completeBooking(id: string): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(id);
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    if (booking.status === 'cancelled') {
      throw new BadRequestException('Cannot complete cancelled booking');
    }

    booking.status = 'completed';
    await booking.save();

    // Posodobi oceno trenerja (opcijsko - tu lahko dodamo logiko za zbiranje ocen)
    const trainer = await this.trainerModel.findById(booking.trainerId);
    return this.mapBookingToResponse(booking, trainer);
  }

  async checkUserBookingLimits(userId: string): Promise<{
    canBook: boolean;
    remainingSessions: number;
    subscriptionStatus: string;
    message?: string;
  }> {
    try {
      // Pokliči Subscription Service za preverjanje paketa
      const subscriptionUrl = `http://subscription-service:3002/subscriptions/user/${userId}/active`;
      const response = await firstValueFrom(
        this.httpService.get(subscriptionUrl),
      );

      if (!response.data || response.data.status !== 'active') {
        return {
          canBook: false,
          remainingSessions: 0,
          subscriptionStatus: 'inactive',
          message: 'No active subscription found',
        };
      }

      // Pridobi število že rezerviranih sej v trenutnem obdobju
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const bookingsThisMonth = await this.bookingModel.countDocuments({
        userId,
        status: { $in: ['confirmed', 'completed'] },
        startTime: { $gte: startOfMonth },
      });

      // Predpostavljamo da paket omogoča določeno število sej na mesec
      // To bi bilo treba pridobiti iz subscription paketa
      const allowedSessions = response.data.plan?.personalTrainingSessions || 0;
      const remainingSessions = Math.max(0, allowedSessions - bookingsThisMonth);

      return {
        canBook: remainingSessions > 0,
        remainingSessions,
        subscriptionStatus: 'active',
        message:
          remainingSessions === 0
            ? 'Monthly session limit reached'
            : undefined,
      };
    } catch (error) {
      // Če subscription service ni dosegljiv, dovoli rezervacijo
      console.error('Failed to check subscription:', error.message);
      return {
        canBook: true,
        remainingSessions: -1,
        subscriptionStatus: 'unknown',
        message: 'Could not verify subscription, booking allowed',
      };
    }
  }

  // ========== HELPER METHODS ==========

  private mapTrainerToResponse(trainer: Trainer): TrainerResponseDto {
    return {
      id: trainer._id.toString(),
      userId: trainer.userId,
      name: trainer.name,
      bio: trainer.bio,
      specializations: trainer.specializations,
      rating: trainer.rating,
      totalSessions: trainer.totalSessions,
      isActive: trainer.isActive,
    };
  }

  private mapBookingToResponse(
    booking: TrainerBooking,
    trainer?: Trainer,
  ): BookingResponseDto {
    return {
      id: booking._id.toString(),
      userId: booking.userId,
      trainerId: booking.trainerId.toString(),
      trainerName: trainer?.name,
      startTime: booking.startTime,
      endTime: booking.endTime,
      duration: booking.duration,
      status: booking.status,
      notes: booking.notes,
      cancelledAt: booking.cancelledAt,
      cancellationReason: booking.cancellationReason,
    };
  }
}
