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
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateGroupClassDto } from './dto/create-group-class.dto';
import { UpdateGroupClassDto } from './dto/update-group-class.dto';
import {
  BookingResponseDto,
  ParticipantResponseDto,
} from './dto/booking-response.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // --- Group Classes ---

  @Post('classes')
  @HttpCode(HttpStatus.CREATED)
  async createGroupClass(@Body() createGroupClassDto: CreateGroupClassDto) {
    return this.appService.createGroupClass(createGroupClassDto);
  }

  @Get('classes/:id')
  async getGroupClass(@Param('id') id: string) {
    return this.appService.getGroupClass(id);
  }

  @Put('classes/:id')
  async updateGroupClass(
    @Param('id') id: string,
    @Body() updateGroupClassDto: UpdateGroupClassDto,
  ) {
    return this.appService.updateGroupClass(id, updateGroupClassDto);
  }

  // --- Bookings ---

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

  // Posodobi rezervacijo
  @Put('bookings/:id')
  async updateBooking(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.appService.updateBooking(id, updateBookingDto);
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
