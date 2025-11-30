import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking, BookingDocument } from './entities/booking.entity';
import { GroupClass, GroupClassDocument } from './entities/group-class.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateGroupClassDto } from './dto/create-group-class.dto';
import { UpdateGroupClassDto } from './dto/update-group-class.dto';
import {
  BookingResponseDto,
  ParticipantResponseDto,
} from './dto/booking-response.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectModel(Booking.name)
    private bookingModel: Model<BookingDocument>,
    @InjectModel(GroupClass.name)
    private groupClassModel: Model<GroupClassDocument>,
  ) {}

  getHello(): string {
    return 'Group Class Booking Service is running!';
  }

  private async validateUser(userId: string): Promise<void> {
    const userServiceUrl =
      process.env.USER_SERVICE_URL || 'http://user-service:3001';
    try {
      const response = await fetch(`${userServiceUrl}/users/${userId}/exists`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundException('User not found');
        }
        this.logger.warn(`User validation failed with status ${response.status}`);
        // Allow validation if service is down? Secure approach: Fail.
        throw new BadRequestException('Could not validate user');
      }
      const data = (await response.json()) as { exists: boolean };
      if (!data.exists) {
        throw new NotFoundException('User not found');
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Error calling user service: ${error}`);
      // Fail safe: Assume user exists? No, better to fail safely.
      throw new BadRequestException('User service unavailable');
    }
  }

  // Create Group Class (Admin/Trainer)
  async createGroupClass(
    createGroupClassDto: CreateGroupClassDto,
  ): Promise<any> {
    // Validate trainer (user)
    await this.validateUser(createGroupClassDto.trainerId);

    const groupClass = new this.groupClassModel({
      ...createGroupClassDto,
      scheduledAt: new Date(createGroupClassDto.scheduledAt),
      status: 'active',
      currentParticipants: 0,
    });

    await groupClass.save();
    return this.mapToClassResponse(groupClass);
  }

  // Get Group Class by ID
  async getGroupClass(id: string): Promise<any> {
    const groupClass = await this.groupClassModel.findById(id).exec();
    if (!groupClass) {
      throw new NotFoundException('Group class not found');
    }
    return this.mapToClassResponse(groupClass);
  }

  // Update Group Class
  async updateGroupClass(
    id: string,
    updateGroupClassDto: UpdateGroupClassDto,
  ): Promise<any> {
    const groupClass = await this.groupClassModel.findById(id).exec();
    if (!groupClass) {
      throw new NotFoundException('Group class not found');
    }

    if (updateGroupClassDto.trainerId) {
      await this.validateUser(updateGroupClassDto.trainerId);
    }

    Object.assign(groupClass, updateGroupClassDto);
    if (updateGroupClassDto.scheduledAt) {
      groupClass.scheduledAt = new Date(updateGroupClassDto.scheduledAt);
    }

    await groupClass.save();
    return this.mapToClassResponse(groupClass);
  }

  // Prijava na skupinsko vadbo
  async createBooking(
    createBookingDto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    const { userId, classId } = createBookingDto;

    // Verify user existence
    await this.validateUser(userId);

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

  async updateBooking(
    bookingId: string,
    updateBookingDto: UpdateBookingDto,
  ) {
    const booking = await this.bookingModel.findById(bookingId);
    
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    
    Object.assign(booking, updateBookingDto);
    
    await booking.save();
    
    return this.mapToBookingResponse(booking);

    
    
    
    
  }

  // Helper to map group class response
  private mapToClassResponse(groupClass: GroupClassDocument) {
    return {
      id: groupClass._id.toString(),
      name: groupClass.name,
      description: groupClass.description,
      trainerId: groupClass.trainerId,
      scheduledAt: groupClass.scheduledAt,
      duration: groupClass.duration,
      capacity: groupClass.capacity,
      currentParticipants: groupClass.currentParticipants,
      status: groupClass.status,
      createdAt: (groupClass as any).createdAt,
      updatedAt: (groupClass as any).updatedAt,
    };
  }

  private mapToBookingResponse(booking: BookingDocument) {
    return {
      id: booking._id.toString(),
      userId: booking.userId,
      classId: booking.classId,
      status: booking.status,
      bookedAt: booking.bookedAt,
      createdAt: (booking as any).createdAt,
      updatedAt: (booking as any).updatedAt,
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
