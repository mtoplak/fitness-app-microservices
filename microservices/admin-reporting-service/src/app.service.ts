import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report, ReportDocument } from './schemas/report.schema';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectModel(Report.name)
    private reportModel: Model<ReportDocument>,
  ) {}

  getHello(): string {
    return 'Admin Reporting Service is running!';
  }

  // --- Reports CRUD ---

  async createReport(createReportDto: CreateReportDto): Promise<Report> {
    // In a real scenario, we would fetch data based on type/dates here
    const data = await this.generateReportData(
      createReportDto.type,
      createReportDto.startDate,
      createReportDto.endDate,
    );

    const report = new this.reportModel({
      ...createReportDto,
      data,
      generatedBy: 'admin_system', // Should be from auth context
    });
    return report.save();
  }

  async findAllReports(): Promise<Report[]> {
    return this.reportModel.find().sort({ createdAt: -1 }).exec();
  }

  async findReportById(id: string): Promise<Report> {
    const report = await this.reportModel.findById(id).exec();
    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }
    return report;
  }

  async updateReport(id: string, updateReportDto: UpdateReportDto): Promise<Report> {
    const report = await this.reportModel
      .findByIdAndUpdate(id, updateReportDto, { new: true })
      .exec();
    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }
    return report;
  }

  async deleteReport(id: string): Promise<{ message: string }> {
    const result = await this.reportModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }
    return { message: 'Report deleted successfully' };
  }

  // --- Dashboard / Stats ---

  async getDashboardStats() {
    // Aggregated stats for the dashboard
    // This would typically make calls to other services or query a replicated analytics DB
    return {
      totalMembers: 150, // Mocked
      activeMemberships: 120,
      monthlyRevenue: 5400,
      todayClasses: 5,
      todayBookings: 34,
    };
  }

  async getClientOverview() {
    // Would fetch from user-service
    return [
      { id: '1', name: 'John Doe', status: 'active', joined: '2024-01-01' },
      { id: '2', name: 'Jane Smith', status: 'active', joined: '2024-02-15' },
    ];
  }

  async getRevenueStats(period: 'daily' | 'monthly' | 'yearly') {
    // Would calculate based on payments
    return {
      period,
      total: 12500,
      breakdown: [
        { label: 'Membership', amount: 8000 },
        { label: 'Classes', amount: 3500 },
        { label: 'Personal Training', amount: 1000 },
      ],
    };
  }

  async getAttendanceStats() {
    return {
      totalBookings: 450,
      attendanceRate: 85, // percentage
      popularClasses: ['Yoga', 'CrossFit'],
    };
  }

  // --- Helper ---

  private async generateReportData(
    type: string,
    start: string,
    end: string,
  ): Promise<any> {
    // Logic to aggregate data based on type
    switch (type) {
      case 'revenue':
        return this.getRevenueStats('monthly');
      case 'attendance':
        return this.getAttendanceStats();
      case 'membership':
        return { newMembers: 10, cancellations: 2, totalActive: 120 };
      default:
        return {};
    }
  }
}

