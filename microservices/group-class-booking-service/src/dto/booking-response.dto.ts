export class BookingResponseDto {
  id: string;
  userId: string;
  classId: string;
  status: string;
  bookedAt: Date;
  className?: string;
  classSchedule?: Date;
  classCapacity?: number;
  currentParticipants?: number;
}

export class ParticipantResponseDto {
  userId: string;
  userName?: string;
  userEmail?: string;
  bookedAt: Date;
  status: string;
}
