import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AppService } from './app.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateTrainerDto, UpdateTrainerDto } from './dto/trainer.dto';
import { SetAvailabilityDto } from './dto/availability.dto';
import {
  BookingResponseDto,
  TrainerResponseDto,
  AvailabilitySlot,
} from './dto/response.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // ========== TRAINERS ==========

  // Prikaz vseh trenerjev
  @Get('trainers')
  async getTrainers(
    @Query('activeOnly') activeOnly?: string,
  ): Promise<TrainerResponseDto[]> {
    return this.appService.getTrainers(activeOnly === 'true');
  }

  // Pridobi posameznega trenerja
  @Get('trainers/:id')
  async getTrainerById(@Param('id') id: string): Promise<TrainerResponseDto> {
    return this.appService.getTrainerById(id);
  }

  // Ustvari trenerja (admin)
  @Post('trainers')
  @HttpCode(HttpStatus.CREATED)
  async createTrainer(
    @Body() createTrainerDto: CreateTrainerDto,
  ): Promise<TrainerResponseDto> {
    return this.appService.createTrainer(createTrainerDto);
  }

  // Posodobi trenerja (admin)
  @Post('trainers/:id')
  async updateTrainer(
    @Param('id') id: string,
    @Body() updateTrainerDto: UpdateTrainerDto,
  ): Promise<TrainerResponseDto> {
    return this.appService.updateTrainer(id, updateTrainerDto);
  }

  // ========== AVAILABILITY ==========

  // Nastavi razpoložljivost trenerja
  @Post('trainers/:id/availability')
  async setTrainerAvailability(
    @Param('id') trainerId: string,
    @Body() availabilityDto: SetAvailabilityDto,
  ): Promise<{ message: string }> {
    return this.appService.setTrainerAvailability(trainerId, availabilityDto);
  }

  // Pridobi razpoložljive termine trenerja
  @Get('trainers/:id/availability')
  async getTrainerAvailability(
    @Param('id') trainerId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<AvailabilitySlot[]> {
    return this.appService.getTrainerAvailability(
      trainerId,
      new Date(from),
      new Date(to),
    );
  }

  // ========== BOOKINGS ==========

  // Rezervacija osebnega treninga
  @Post('bookings')
  @HttpCode(HttpStatus.CREATED)
  async createBooking(
    @Body() createBookingDto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.appService.createBooking(createBookingDto);
  }

  // Pridobi rezervacije uporabnika
  @Get('bookings/user/:userId')
  async getUserBookings(
    @Param('userId') userId: string,
    @Query('status') status?: string,
  ): Promise<BookingResponseDto[]> {
    return this.appService.getUserBookings(userId, status);
  }

  // Pridobi rezervacije trenerja
  @Get('bookings/trainer/:trainerId')
  async getTrainerBookings(
    @Param('trainerId') trainerId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<BookingResponseDto[]> {
    return this.appService.getTrainerBookings(
      trainerId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  // Pridobi posamezno rezervacijo
  @Get('bookings/:id')
  async getBookingById(@Param('id') id: string): Promise<BookingResponseDto> {
    return this.appService.getBookingById(id);
  }

  // Prekliči rezervacijo
  @Delete('bookings/:id')
  @HttpCode(HttpStatus.OK)
  async cancelBooking(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ): Promise<{ message: string }> {
    return this.appService.cancelBooking(id, body.reason);
  }

  // Označi rezervacijo kot zaključeno (trener)
  @Post('bookings/:id/complete')
  async completeBooking(@Param('id') id: string): Promise<BookingResponseDto> {
    return this.appService.completeBooking(id);
  }

  // Preveri omejitve paketa uporabnika
  @Get('users/:userId/booking-limits')
  async checkUserBookingLimits(@Param('userId') userId: string): Promise<{
    canBook: boolean;
    remainingSessions: number;
    subscriptionStatus: string;
    message?: string;
  }> {
    return this.appService.checkUserBookingLimits(userId);
  }
}
