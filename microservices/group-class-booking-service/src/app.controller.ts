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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AppService } from './app.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateGroupClassDto } from './dto/create-group-class.dto';
import { UpdateGroupClassDto } from './dto/update-group-class.dto';
import {
  BookingResponseDto,
  ParticipantResponseDto,
} from './dto/booking-response.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Public } from './auth/public.decorator';
import { Roles } from './auth/roles.decorator';
import { CurrentUser, RequestUser } from './auth/user.decorator';

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

  // --- Group Classes ---

  @Roles('admin', 'trainer')
  @Post('classes')
  @ApiTags('Classes')
  @ApiOperation({ summary: 'Create a new group class' })
  @ApiResponse({ status: 201, description: 'Class created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @HttpCode(HttpStatus.CREATED)
  async createGroupClass(@Body() createGroupClassDto: CreateGroupClassDto) {
    return this.appService.createGroupClass(createGroupClassDto);
  }

  @Public()
  @Get('classes/:id')
  @ApiTags('Classes')
  @ApiOperation({ summary: 'Get group class by ID' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Class found' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async getGroupClass(@Param('id') id: string) {
    return this.appService.getGroupClass(id);
  }

  @Roles('admin', 'trainer')
  @Put('classes/:id')
  @ApiTags('Classes')
  @ApiOperation({ summary: 'Update group class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Class updated' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async updateGroupClass(
    @Param('id') id: string,
    @Body() updateGroupClassDto: UpdateGroupClassDto,
  ) {
    return this.appService.updateGroupClass(id, updateGroupClassDto);
  }

  // --- Bookings ---

  @Post('bookings')
  @ApiTags('Bookings')
  @ApiOperation({ summary: 'Create a booking for a group class' })
  @ApiResponse({ status: 201, description: 'Booking created', type: BookingResponseDto })
  @ApiResponse({ status: 400, description: 'Class is full or invalid data' })
  @HttpCode(HttpStatus.CREATED)
  async createBooking(
    @Body() createBookingDto: CreateBookingDto,
    @CurrentUser() user: RequestUser,
  ): Promise<BookingResponseDto> {
    // Use authenticated user's ID if not provided
    if (!createBookingDto.userId && user) {
      createBookingDto.userId = user.userId;
    }
    return this.appService.createBooking(createBookingDto);
  }

  @Delete('bookings/:id')
  @ApiTags('Bookings')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  @HttpCode(HttpStatus.OK)
  async cancelBooking(@Param('id') id: string): Promise<{ message: string }> {
    return this.appService.cancelBooking(id);
  }

  @Get('bookings')
  @ApiTags('Bookings')
  @ApiOperation({ summary: 'Get user bookings' })
  @ApiQuery({ name: 'userId', description: 'User ID', required: false })
  @ApiResponse({ status: 200, description: 'List of bookings', type: [BookingResponseDto] })
  async getUserBookings(
    @Query('userId') userId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<BookingResponseDto[]> {
    // Use authenticated user's ID if not provided
    const targetUserId = userId || user?.userId;
    return this.appService.getUserBookings(targetUserId);
  }

  @Put('bookings/:id')
  @ApiTags('Bookings')
  @ApiOperation({ summary: 'Update a booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking updated', type: BookingResponseDto })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async updateBooking(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.appService.updateBooking(id, updateBookingDto);
  }
  
  // Delete class
  @Roles('admin', 'trainer')
  @Delete('classes/:id')
  @HttpCode(HttpStatus.OK)
  async deleteClass(@Param('id') id: string): Promise<{ message: string }> {
    return this.appService.deleteClass(id);
  }
  
  // Seznam vseh udeležencev za določeno vadbo (za trenerja)
  @Roles('admin', 'trainer')
  @Get('classes/:classId/participants')
  @ApiTags('Classes')
  @ApiOperation({ summary: 'Get class participants' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'List of participants', type: [ParticipantResponseDto] })
  async getClassParticipants(
    @Param('classId') classId: string,
  ): Promise<ParticipantResponseDto[]> {
    return this.appService.getClassParticipants(classId);
  }

  @Public()
  @Get('classes/:classId/availability')
  @ApiTags('Classes')
  @ApiOperation({ summary: 'Check class availability' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Availability info' })
  async checkClassAvailability(@Param('classId') classId: string): Promise<{
    available: boolean;
    capacity: number;
    currentParticipants: number;
    remainingSpots: number;
  }> {
    return this.appService.checkClassAvailability(classId);
  }

  @Public()
  @Get('classes')
  @ApiTags('Classes')
  @ApiOperation({ summary: 'Get all upcoming classes' })
  @ApiResponse({ status: 200, description: 'List of upcoming classes' })
  async getUpcomingClasses() {
    return this.appService.getUpcomingClasses();
  }
}
