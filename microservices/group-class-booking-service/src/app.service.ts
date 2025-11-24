import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking, BookingDocument } from './entities/booking.entity';
import { GroupClass, GroupClassDocument } from './entities/group-class.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  BookingResponseDto,
  ParticipantResponseDto,
} from './dto/booking-response.dto';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(Booking.name)
    private bookingModel: Model<BookingDocument>,
    @InjectModel(GroupClass.name)
    private groupClassModel: Model<GroupClassDocument>,
  ) {}

  getHello(): string {
    return 'Group Class Booking Service is running!';
  }

  // Prijava na skupinsko vadbo
  async createBooking(
    createBookingDto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    const { userId, classId } = createBookingDto;

    // Preveri, če vadba obstaja
    const groupClass = await this.groupClassModel.findById(classId);

    if (!groupClass) {
      throw new NotFoundException('Group class not found');
    }

    // Preveri, če je vadba še aktivna
    if (groupClass.status !== 'active') {
      throw new BadRequestException('This class is not available for booking');
    }

    // Preveri kapaciteto
    if (groupClass.currentParticipants >= groupClass.capacity) {
      throw new BadRequestException('Class is fully booked');
    }

    // Preveri, če uporabnik že ima rezervacijo
    const existingBooking = await this.bookingModel.findOne({
      userId,
      classId,
      status: 'confirmed',
    });

    if (existingBooking) {
      throw new BadRequestException('You already have a booking for this class');
    }

    // Ustvari novo rezervacijo
    const booking = new this.bookingModel({
      userId,
      classId,
      status: 'confirmed',
      bookedAt: new Date(),
    });

    await booking.save();

    // Posodobi število udeležencev
    groupClass.currentParticipants += 1;
    await groupClass.save();

    return {
      id: booking._id.toString(),
      userId: booking.userId,
      classId: booking.classId,
      status: booking.status,
      bookedAt: booking.bookedAt,
      className: groupClass.name,
      classSchedule: groupClass.scheduledAt,
      classCapacity: groupClass.capacity,
      currentParticipants: groupClass.currentParticipants,
    };
  }

  // Odjava od skupinske vadbe
  async cancelBooking(bookingId: string): Promise<{ message: string }> {
    const booking = await this.bookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === 'cancelled') {
      throw new BadRequestException('Booking is already cancelled');
    }

    // Posodobi status rezervacije
    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    await booking.save();

    // Zmanjšaj število udeležencev
    const groupClass = await this.groupClassModel.findById(booking.classId);

    if (groupClass && groupClass.currentParticipants > 0) {
      groupClass.currentParticipants -= 1;
      await groupClass.save();
    }

    return { message: 'Booking cancelled successfully' };
  }

  // Seznam vseh rezervacij uporabnika
  async getUserBookings(userId: string): Promise<BookingResponseDto[]> {
    const bookings = await this.bookingModel
      .find({ userId })
      .sort({ bookedAt: -1 })
      .exec();

    const bookingsWithClass = await Promise.all(
      bookings.map(async (booking) => {
        const groupClass = await this.groupClassModel.findById(booking.classId);
        return {
          id: booking._id.toString(),
          userId: booking.userId,
          classId: booking.classId,
          status: booking.status,
          bookedAt: booking.bookedAt,
          className: groupClass?.name,
          classSchedule: groupClass?.scheduledAt,
          classCapacity: groupClass?.capacity,
          currentParticipants: groupClass?.currentParticipants,
        };
      }),
    );

    return bookingsWithClass;
  }

  // Seznam udeležencev za določeno vadbo (za trenerja)
  async getClassParticipants(
    classId: string,
  ): Promise<ParticipantResponseDto[]> {
    const groupClass = await this.groupClassModel.findById(classId);

    if (!groupClass) {
      throw new NotFoundException('Group class not found');
    }

    const bookings = await this.bookingModel
      .find({
        classId,
        status: 'confirmed',
      })
      .sort({ bookedAt: 1 })
      .exec();

    return bookings.map((booking) => ({
      userId: booking.userId,
      bookedAt: booking.bookedAt,
      status: booking.status,
    }));
  }

  // Preveri razpoložljivost vadbe
  async checkClassAvailability(classId: string): Promise<{
    available: boolean;
    capacity: number;
    currentParticipants: number;
    remainingSpots: number;
  }> {
    const groupClass = await this.groupClassModel.findById(classId);

    if (!groupClass) {
      throw new NotFoundException('Group class not found');
    }

    const remainingSpots = groupClass.capacity - groupClass.currentParticipants;

    return {
      available: remainingSpots > 0 && groupClass.status === 'active',
      capacity: groupClass.capacity,
      currentParticipants: groupClass.currentParticipants,
      remainingSpots: Math.max(0, remainingSpots),
    };
  }

  // Pridobi vse prihajajoče vadbe
  async getUpcomingClasses() {
    const now = new Date();
    const classes = await this.groupClassModel
      .find({
        scheduledAt: { $gt: now },
        status: 'active',
      })
      .sort({ scheduledAt: 1 })
      .exec();

    return classes.map((cls) => ({
      id: cls._id.toString(),
      name: cls.name,
      description: cls.description,
      trainerId: cls.trainerId,
      scheduledAt: cls.scheduledAt,
      duration: cls.duration,
      capacity: cls.capacity,
      currentParticipants: cls.currentParticipants,
      availableSpots: cls.capacity - cls.currentParticipants,
      status: cls.status,
    }));
  }
}
