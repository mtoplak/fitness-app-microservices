import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report, ReportDocument } from './schemas/report.schema';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

type TrainerBookingReport = {
  id?: string;
  userId: string;
  trainerId: string;
  trainerName?: string;
  startTime: string;
  endTime: string;
  status?: string;
};

type GroupClassBookingReport = {
  id?: string;
  userId: string;
  classId: string;
  status?: string;
  bookedAt?: string;
  className?: string;
  classSchedule?: string;
  classCapacity?: number;
  currentParticipants?: number;
};

type WorkoutSchedule = {
  id: string;
  name: string;
  description?: string;
  trainerId: string;
  scheduledAt: string;
  duration: number;
  capacity?: number;
  currentParticipants?: number;
  type?: string;
  status?: string;
  approvalStatus?: string;
  notes?: string;
  createdAt?: string;
};

type AdminClassStatus = 'pending' | 'approved' | 'rejected';

type AdminClassResponse = {
  _id: string;
  name: string;
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  duration?: number;
  capacity?: number;
  status: AdminClassStatus;
  schedule: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  trainerUserId?: {
    _id: string;
    fullName?: string;
    email?: string;
  };
  totalBookings?: number;
  createdAt?: string;
};

type AdminClassesResponse = {
  classes: AdminClassResponse[];
  statistics: {
    totalClasses: number;
    pendingClasses: number;
    approvedClasses: number;
    rejectedClasses: number;
  };
};

type UserSummary = {
  _id: string;
  fullName?: string;
  email?: string;
  name?: string;
};

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectModel(Report.name)
    private reportModel: Model<ReportDocument>,
    private readonly configService: ConfigService,
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

  async getDashboardStats(authorization?: string) {
    const { start, end } = this.getRecentRange(30);
    const userServiceUrl =
      this.configService.get<string>('USER_SERVICE_URL') || 'http://user-service:3001';
    const subscriptionServiceUrl =
      this.configService.get<string>('SUBSCRIPTION_SERVICE_URL') ||
      'http://subscription-service:3002';

    const userDashboardUrl = new URL('/api/admin/dashboard', userServiceUrl);
    const revenueUrl = new URL('/api/reports/revenue', subscriptionServiceUrl);
    revenueUrl.searchParams.set('startDate', start);
    revenueUrl.searchParams.set('endDate', end);

    const [userDashboard, revenueReport, attendanceReport] = await Promise.all([
      this.fetchJson<{ users?: { total?: number } }>(
        userDashboardUrl.toString(),
        authorization,
        'User dashboard fetch failed',
      ),
      this.fetchJson<{ totalRevenue?: number; totalActiveMemberships?: number }>(
        revenueUrl.toString(),
        authorization,
        'Revenue report fetch failed',
      ),
      this.getAttendanceReport(start, end, authorization),
    ]);

    return {
      totalUsers: userDashboard?.users?.total ?? 0,
      activeSubscriptions: revenueReport?.totalActiveMemberships ?? 0,
      totalRevenue: revenueReport?.totalRevenue ?? 0,
      classAttendance: attendanceReport?.summary?.totalBookings ?? 0,
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

  async getRevenueReport(
    startDate?: string,
    endDate?: string,
    authorization?: string,
  ) {
    const { start, end } = this.normalizeDateRange(startDate, endDate);
    const subscriptionServiceUrl =
      this.configService.get<string>('SUBSCRIPTION_SERVICE_URL') ||
      'http://subscription-service:3002';
    const url = new URL('/api/reports/revenue', subscriptionServiceUrl);
    url.searchParams.set('startDate', start);
    url.searchParams.set('endDate', end);

    const response = await fetch(url.toString(), {
      headers: this.buildHeaders(authorization),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Subscription revenue report failed: ${response.status} ${body}`);
      throw new Error('Failed to load revenue report.');
    }

    return response.json();
  }

  async getAttendanceReport(
    startDate?: string,
    endDate?: string,
    authorization?: string,
  ) {
    const { start, end } = this.normalizeDateRange(startDate, endDate);
    const groupClassServiceUrl =
      this.configService.get<string>('GROUP_CLASS_BOOKING_SERVICE_URL') ||
      'http://group-class-booking-service:3005';
    const trainerBookingServiceUrl =
      this.configService.get<string>('TRAINER_BOOKING_SERVICE_URL') ||
      'http://trainer-booking-service:3003';

    const groupClassUrl = new URL('/api/reports/attendance', groupClassServiceUrl);
    groupClassUrl.searchParams.set('startDate', start);
    groupClassUrl.searchParams.set('endDate', end);

    const trainerUrl = new URL('/api/trainer-bookings/report', trainerBookingServiceUrl);
    trainerUrl.searchParams.set('startDate', start);
    trainerUrl.searchParams.set('endDate', end);

    const [groupBookings, trainerBookings] = await Promise.all([
      this.fetchJson<GroupClassBookingReport[]>(
        groupClassUrl.toString(),
        authorization,
        'Group class attendance report',
      ),
      this.fetchJson<TrainerBookingReport[]>(
        trainerUrl.toString(),
        authorization,
        'Trainer bookings report',
      ),
    ]);

    return this.buildAttendanceReport(
      { start, end },
      groupBookings ?? [],
      trainerBookings ?? [],
    );
  }

  async getAdminClasses(
    authorization?: string,
  ): Promise<AdminClassesResponse> {
    const scheduleServiceUrl =
      this.configService.get<string>('WORKOUT_SCHEDULE_SERVICE_URL') ||
      'http://workout-schedule-service:3004';
    const schedulesUrl = new URL('/api/schedules', scheduleServiceUrl);

    const schedules = await this.fetchJson<WorkoutSchedule[]>(
      schedulesUrl.toString(),
      authorization,
      'Workout schedules fetch failed',
    );

    const trainerIds = Array.from(
      new Set(schedules.map((schedule) => schedule.trainerId).filter(Boolean)),
    );
    const trainerMap = await this.loadUsers(trainerIds, authorization);

    const classes = schedules.map((schedule) =>
      this.mapScheduleToAdminClass(schedule, trainerMap.get(schedule.trainerId)),
    );

    const pendingClasses = classes.filter((cls) => cls.status === 'pending').length;
    const approvedClasses = classes.filter((cls) => cls.status === 'approved').length;
    const rejectedClasses = classes.filter((cls) => cls.status === 'rejected').length;

    return {
      classes,
      statistics: {
        totalClasses: classes.length,
        pendingClasses,
        approvedClasses,
        rejectedClasses,
      },
    };
  }

  async approveAdminClass(
    id: string,
    user: { userId: string } | null,
    comment?: string,
    authorization?: string,
  ) {
    const scheduleServiceUrl =
      this.configService.get<string>('WORKOUT_SCHEDULE_SERVICE_URL') ||
      'http://workout-schedule-service:3004';
    const approveUrl = new URL(`/api/schedules/${id}/approve`, scheduleServiceUrl);

    const approvedBy = user?.userId ?? 'admin';
    const response = await this.fetchJson<WorkoutSchedule>(
      approveUrl.toString(),
      authorization,
      'Approve schedule failed',
      {
        method: 'POST',
        body: JSON.stringify({ approvedBy }),
      },
    );

    if (comment) {
      await this.updateAdminClass(
        id,
        { status: 'approved' },
        authorization,
        { notes: comment },
      );
    }

    return response;
  }

  async rejectAdminClass(
    id: string,
    user: { userId: string } | null,
    comment?: string,
    authorization?: string,
  ) {
    const scheduleServiceUrl =
      this.configService.get<string>('WORKOUT_SCHEDULE_SERVICE_URL') ||
      'http://workout-schedule-service:3004';
    const rejectUrl = new URL(`/api/schedules/${id}/reject`, scheduleServiceUrl);

    const rejectedBy = user?.userId ?? 'admin';
    return this.fetchJson<WorkoutSchedule>(
      rejectUrl.toString(),
      authorization,
      'Reject schedule failed',
      {
        method: 'POST',
        body: JSON.stringify({ rejectedBy, reason: comment }),
      },
    );
  }

  async updateAdminClass(
    id: string,
    body: {
      name?: string;
      description?: string;
      difficulty?: 'easy' | 'medium' | 'hard';
      duration?: number;
      capacity?: number;
      status?: string;
    },
    authorization?: string,
    overrides?: { notes?: string },
  ) {
    const scheduleServiceUrl =
      this.configService.get<string>('WORKOUT_SCHEDULE_SERVICE_URL') ||
      'http://workout-schedule-service:3004';
    const updateUrl = new URL(`/api/schedules/${id}`, scheduleServiceUrl);

    const payload: Record<string, unknown> = {
      name: body.name,
      description: body.description,
      duration: body.duration,
      capacity: body.capacity,
      type: body.difficulty,
      notes: overrides?.notes,
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    return this.fetchJson<WorkoutSchedule>(
      updateUrl.toString(),
      authorization,
      'Update schedule failed',
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    );
  }

  async deleteAdminClass(id: string, authorization?: string) {
    const scheduleServiceUrl =
      this.configService.get<string>('WORKOUT_SCHEDULE_SERVICE_URL') ||
      'http://workout-schedule-service:3004';
    const deleteUrl = new URL(`/api/schedules/${id}`, scheduleServiceUrl);

    return this.fetchJson<{ message: string }>(
      deleteUrl.toString(),
      authorization,
      'Delete schedule failed',
      {
        method: 'DELETE',
      },
    );
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

  private normalizeDateRange(startDate?: string, endDate?: string) {
    const fallbackStart = new Date();
    fallbackStart.setMonth(fallbackStart.getMonth() - 3);
    const start = startDate ?? fallbackStart.toISOString().split('T')[0];
    const end = endDate ?? new Date().toISOString().split('T')[0];
    return { start, end };
  }

  private getRecentRange(days: number) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    };
  }

  private buildHeaders(authorization?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authorization) {
      headers.Authorization = authorization;
    }
    return headers;
  }

  private async fetchJson<T>(
    url: string,
    authorization?: string,
    context?: string,
    options?: RequestInit,
  ): Promise<T> {
    const response = await fetch(url, {
      headers: this.buildHeaders(authorization),
      ...(options ?? {}),
    });
    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `${context ?? 'Request failed'}: ${response.status} ${body}`,
      );
      throw new Error(context ?? 'Request failed');
    }
    return response.json() as Promise<T>;
  }

  private buildAttendanceReport(
    period: { start: string; end: string },
    groupBookings: GroupClassBookingReport[],
    trainerBookings: TrainerBookingReport[],
  ) {
    const dailyAttendance = this.initializeDailyAttendance(period.start, period.end);

    const classAttendanceMap = new Map<
      string,
      {
        className: string;
        capacity: number;
        totalBookings: number;
        confirmedBookings: number;
        cancelledBookings: number;
      }
    >();
    const classCapacityById = new Map<string, number>();

    let totalBookings = 0;
    let confirmedBookings = 0;
    let cancelledBookings = 0;
    let confirmedPersonalTraining = 0;

    groupBookings.forEach((booking) => {
      totalBookings += 1;
      if (booking.status === 'confirmed') {
        confirmedBookings += 1;
      }
      if (booking.status === 'cancelled') {
        cancelledBookings += 1;
      }

      const bookingDate = this.toDateKey(booking.classSchedule ?? booking.bookedAt);
      if (bookingDate) {
        const entry = dailyAttendance.get(bookingDate);
        if (entry) {
          entry.totalBookings += 1;
          entry.groupClasses += 1;
          if (booking.status === 'confirmed') {
            entry.confirmedBookings += 1;
          }
        }
      }

      const classKey = booking.className ?? booking.classId;
      const current = classAttendanceMap.get(classKey) ?? {
        className: classKey,
        capacity: booking.classCapacity ?? 0,
        totalBookings: 0,
        confirmedBookings: 0,
        cancelledBookings: 0,
      };

      current.capacity = Math.max(current.capacity, booking.classCapacity ?? 0);
      current.totalBookings += 1;
      if (booking.status === 'confirmed') {
        current.confirmedBookings += 1;
      }
      if (booking.status === 'cancelled') {
        current.cancelledBookings += 1;
      }
      classAttendanceMap.set(classKey, current);

      if (booking.classId && booking.classCapacity) {
        classCapacityById.set(booking.classId, booking.classCapacity);
      }
    });

    trainerBookings.forEach((booking) => {
      totalBookings += 1;
      if (booking.status === 'confirmed') {
        confirmedBookings += 1;
        confirmedPersonalTraining += 1;
      }
      if (booking.status === 'cancelled') {
        cancelledBookings += 1;
      }

      const bookingDate = this.toDateKey(booking.startTime);
      if (bookingDate) {
        const entry = dailyAttendance.get(bookingDate);
        if (entry) {
          entry.totalBookings += 1;
          entry.personalTraining += 1;
          if (booking.status === 'confirmed') {
            entry.confirmedBookings += 1;
          }
        }
      }
    });

    const groupClassAttendance = Array.from(classAttendanceMap.values()).map((entry) => {
      const occupancyRate =
        entry.capacity > 0
          ? Math.round((entry.confirmedBookings / entry.capacity) * 100)
          : 0;
      return {
        className: entry.className,
        capacity: entry.capacity,
        totalBookings: entry.totalBookings,
        confirmedBookings: entry.confirmedBookings,
        cancelledBookings: entry.cancelledBookings,
        occupancyRate,
        averageOccupancy: occupancyRate,
      };
    });

    const totalGroupCapacity = Array.from(classCapacityById.values()).reduce(
      (sum, value) => sum + value,
      0,
    );
    const overallOccupancyRate =
      totalGroupCapacity > 0
        ? Math.round(
            (groupBookings.filter((booking) => booking.status === 'confirmed').length /
              totalGroupCapacity) *
              100,
          )
        : 0;

    return {
      period,
      summary: {
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        groupClassBookings: groupBookings.length,
        personalTrainingBookings: trainerBookings.length,
        confirmedPersonalTraining,
        overallOccupancyRate,
      },
      groupClassAttendance,
      dailyAttendance: Array.from(dailyAttendance.values()),
      personalTraining: {
        total: trainerBookings.length,
        confirmed: confirmedPersonalTraining,
        cancelled: trainerBookings.filter((booking) => booking.status === 'cancelled').length,
      },
    };
  }

  private initializeDailyAttendance(start: string, end: string) {
    const map = new Map<
      string,
      {
        date: string;
        totalBookings: number;
        confirmedBookings: number;
        groupClasses: number;
        personalTraining: number;
      }
    >();

    const current = new Date(`${start}T00:00:00Z`);
    const endDate = new Date(`${end}T00:00:00Z`);
    while (current <= endDate) {
      const key = current.toISOString().split('T')[0];
      map.set(key, {
        date: key,
        totalBookings: 0,
        confirmedBookings: 0,
        groupClasses: 0,
        personalTraining: 0,
      });
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return map;
  }

  private toDateKey(value?: string) {
    if (!value) {
      return undefined;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }
    return date.toISOString().split('T')[0];
  }

  private mapScheduleToAdminClass(
    schedule: WorkoutSchedule,
    trainer?: UserSummary,
  ): AdminClassResponse {
    const scheduledAt = new Date(schedule.scheduledAt);
    const duration = schedule.duration ?? 60;
    const endAt = new Date(scheduledAt.getTime() + duration * 60000);
    const status = this.mapApprovalStatus(schedule.approvalStatus, schedule.status);

    return {
      _id: schedule.id,
      name: schedule.name,
      description: schedule.description,
      duration: schedule.duration,
      capacity: schedule.capacity,
      status,
      schedule: [
        {
          dayOfWeek: scheduledAt.getDay(),
          startTime: this.formatTime(scheduledAt),
          endTime: this.formatTime(endAt),
        },
      ],
      trainerUserId: trainer
        ? {
            _id: trainer._id,
            fullName: trainer.fullName ?? trainer.name,
            email: trainer.email,
          }
        : undefined,
      totalBookings: schedule.currentParticipants ?? 0,
      createdAt: schedule.createdAt,
    };
  }

  private mapApprovalStatus(
    approvalStatus?: string,
    scheduleStatus?: string,
  ): AdminClassStatus {
    if (approvalStatus === 'pending' || approvalStatus === 'approved' || approvalStatus === 'rejected') {
      return approvalStatus;
    }

    if (scheduleStatus === 'cancelled') {
      return 'rejected';
    }

    return 'approved';
  }

  private formatTime(date: Date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private async loadUsers(
    userIds: string[],
    authorization?: string,
  ): Promise<Map<string, UserSummary>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const userServiceUrl =
      this.configService.get<string>('USER_SERVICE_URL') || 'http://user-service:3001';

    const results = await Promise.all(
      userIds.map(async (userId) => {
        const userUrl = new URL(`/api/users/${userId}`, userServiceUrl);
        try {
          const user = await this.fetchJson<UserSummary>(
            userUrl.toString(),
            authorization,
            `User lookup failed for ${userId}`,
          );
          return [userId, user] as const;
        } catch (error) {
          this.logger.warn(`Failed to load user ${userId}`);
          return undefined;
        }
      }),
    );

    const map = new Map<string, UserSummary>();
    results.forEach((entry) => {
      if (entry) {
        map.set(entry[0], entry[1]);
      }
    });

    return map;
  }
}
