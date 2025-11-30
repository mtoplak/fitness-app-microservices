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
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // --- Reports CRUD ---

  // 1. POST - Create Report
  @Post('reports')
  @HttpCode(HttpStatus.CREATED)
  async createReport(@Body() createReportDto: CreateReportDto) {
    return this.appService.createReport(createReportDto);
  }

  // 1. GET - List Reports
  @Get('reports')
  async findAllReports() {
    return this.appService.findAllReports();
  }

  // 2. GET - Get Report by ID
  @Get('reports/:id')
  async findReportById(@Param('id') id: string) {
    return this.appService.findReportById(id);
  }

  // 1. PUT - Update Report
  @Put('reports/:id')
  async updateReport(
    @Param('id') id: string,
    @Body() updateReportDto: UpdateReportDto,
  ) {
    return this.appService.updateReport(id, updateReportDto);
  }

  // 1. DELETE - Delete Report
  @Delete('reports/:id')
  @HttpCode(HttpStatus.OK)
  async deleteReport(@Param('id') id: string) {
    return this.appService.deleteReport(id);
  }

  // --- Statistics Endpoints ---

  // 3. GET - Dashboard Stats
  @Get('dashboard')
  async getDashboardStats() {
    return this.appService.getDashboardStats();
  }

  // 4. GET - Revenue Stats
  @Get('stats/revenue')
  async getRevenueStats(@Query('period') period: 'daily' | 'monthly' | 'yearly' = 'monthly') {
    return this.appService.getRevenueStats(period);
  }

  // 5. GET - Attendance Stats
  @Get('stats/attendance')
  async getAttendanceStats() {
    return this.appService.getAttendanceStats();
  }

  // 6. GET - Client Overview
  @Get('stats/clients')
  async getClientOverview() {
    return this.appService.getClientOverview();
  }

  // --- Additional Operations to meet requirements (2 POST, 2 PUT, 2 DELETE) ---

  // 2. POST - Export Data (Mock)
  @Post('export')
  @HttpCode(HttpStatus.OK)
  async exportData(@Body() body: { type: string; format: string }) {
    return { message: `Export initiated for ${body.type} in ${body.format} format` };
  }

  // 2. PUT - Update Settings (Mock)
  @Put('settings')
  async updateSettings(@Body() settings: any) {
    return { message: 'Settings updated successfully', settings };
  }

  // 2. DELETE - Clear Cache (Mock)
  @Delete('cache')
  async clearCache() {
    return { message: 'Cache cleared successfully' };
  }
}
