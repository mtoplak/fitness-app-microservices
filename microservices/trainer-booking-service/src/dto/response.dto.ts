export class BookingResponseDto {
  id: string;
  userId: string;
  trainerId: string;
  trainerName?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class TrainerResponseDto {
  id: string;
  userId: string;
  name: string;
  bio?: string;
  specializations?: string[];
  photoUrl?: string;
  rating?: number;
  totalSessions?: number;
  isActive: boolean;
}

export class AvailabilitySlot {
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
}
