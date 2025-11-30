export class ScheduleResponseDto {
  id: string;
  name: string;
  description?: string;
  trainerId: string;
  memberId?: string;
  scheduledAt: Date;
  duration: number;
  capacity: number;
  currentParticipants?: number;
  type?: string;
  status: string;
  approvalStatus?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ConflictCheckDto {
  hasConflict: boolean;
  conflictingSchedules?: Array<{
    id: string;
    name: string;
    scheduledAt: Date;
    duration: number;
    trainerId: string;
  }>;
}
