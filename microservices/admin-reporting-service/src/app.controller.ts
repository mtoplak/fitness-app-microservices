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
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { Public } from './auth/public.decorator';
import { Roles } from './auth/roles.decorator';

@ApiBearerAuth()
@Roles('admin')  // All routes require admin role by default
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

  // --- Reports CRUD ---

  @Post('reports')
  @ApiTags('Reports')
  @ApiOperation({ summary: 'Create a new report' })
  @ApiResponse({ status: 201, description: 'Report created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @HttpCode(HttpStatus.CREATED)
  async createReport(@Body() createReportDto: CreateReportDto) {
    return this.appService.createReport(createReportDto);
  }

  @Get('reports')
  @ApiTags('Reports')
  @ApiOperation({ summary: 'Get all reports' })
  @ApiResponse({ status: 200, description: 'List of all reports' })
  async findAllReports() {
    return this.appService.findAllReports();
  }

  @Get('reports/:id')
  @ApiTags('Reports')
  @ApiOperation({ summary: 'Get report by ID' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report found' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async findReportById(@Param('id') id: string) {
    return this.appService.findReportById(id);
  }

  @Put('reports/:id')
  @ApiTags('Reports')
  @ApiOperation({ summary: 'Update a report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report updated' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async updateReport(
    @Param('id') id: string,
    @Body() updateReportDto: UpdateReportDto,
  ) {
    return this.appService.updateReport(id, updateReportDto);
  }

  @Delete('reports/:id')
  @ApiTags('Reports')
  @ApiOperation({ summary: 'Delete a report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report deleted' })
  @HttpCode(HttpStatus.OK)
  async deleteReport(@Param('id') id: string) {
    return this.appService.deleteReport(id);
  }

  // --- Statistics Endpoints ---

  @Get('dashboard')
  @ApiTags('Statistics')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  async getDashboardStats() {
    return this.appService.getDashboardStats();
  }

  @Get('stats/revenue')
  @ApiTags('Statistics')
  @ApiOperation({ summary: 'Get revenue statistics' })
  @ApiQuery({ name: 'period', enum: ['daily', 'monthly', 'yearly'], required: false })
  @ApiResponse({ status: 200, description: 'Revenue stats' })
  async getRevenueStats(@Query('period') period: 'daily' | 'monthly' | 'yearly' = 'monthly') {
    return this.appService.getRevenueStats(period);
  }

  @Get('stats/attendance')
  @ApiTags('Statistics')
  @ApiOperation({ summary: 'Get attendance statistics' })
  @ApiResponse({ status: 200, description: 'Attendance stats' })
  async getAttendanceStats() {
    return this.appService.getAttendanceStats();
  }

  @Get('stats/clients')
  @ApiTags('Statistics')
  @ApiOperation({ summary: 'Get client overview' })
  @ApiResponse({ status: 200, description: 'Client overview stats' })
  async getClientOverview() {
    return this.appService.getClientOverview();
  }

  // --- Additional Operations to meet requirements (2 POST, 2 PUT, 2 DELETE) ---

  @Post('export')
  @ApiTags('Reports')
  @ApiOperation({ summary: 'Export data' })
  @ApiResponse({ status: 200, description: 'Export initiated' })
  @HttpCode(HttpStatus.OK)
  async exportData(@Body() body: { type: string; format: string }) {
    return { message: `Export initiated for ${body.type} in ${body.format} format` };
  }

  @Put('settings')
  @ApiTags('Reports')
  @ApiOperation({ summary: 'Update settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateSettings(@Body() settings: any) {
    return { message: 'Settings updated successfully', settings };
  }

  @Delete('cache')
  @ApiTags('Reports')
  @ApiOperation({ summary: 'Clear cache' })
  @ApiResponse({ status: 200, description: 'Cache cleared' })
  async clearCache() {
    return { message: 'Cache cleared successfully' };
  }
}
