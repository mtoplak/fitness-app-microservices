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
import {
  BookingResponseDto,
  ParticipantResponseDto,
} from './dto/booking-response.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Prijava na skupinsko vadbo
  @Post('bookings')
  @HttpCode(HttpStatus.CREATED)
  async createBooking(
    @Body() createBookingDto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.appService.createBooking(createBookingDto);
  }

  // Odjava od skupinske vadbe
  @Delete('bookings/:id')
  @HttpCode(HttpStatus.OK)
  async cancelBooking(@Param('id') id: string): Promise<{ message: string }> {
    return this.appService.cancelBooking(id);
  }

  // Seznam vseh rezervacij uporabnika
  @Get('bookings')
  async getUserBookings(
    @Query('userId') userId: string,
  ): Promise<BookingResponseDto[]> {
    return this.appService.getUserBookings(userId);
  }

  // Seznam vseh udeležencev za določeno vadbo (za trenerja)
  @Get('classes/:classId/participants')
  async getClassParticipants(
    @Param('classId') classId: string,
  ): Promise<ParticipantResponseDto[]> {
    return this.appService.getClassParticipants(classId);
  }

  // Preveri razpoložljivost (kapaciteto) vadbe
  @Get('classes/:classId/availability')
  async checkClassAvailability(@Param('classId') classId: string): Promise<{
    available: boolean;
    capacity: number;
    currentParticipants: number;
    remainingSpots: number;
  }> {
    return this.appService.checkClassAvailability(classId);
  }

  // Pridobi vse prihajajoče vadbe
  @Get('classes')
  async getUpcomingClasses() {
    return this.appService.getUpcomingClasses();
  }
}
