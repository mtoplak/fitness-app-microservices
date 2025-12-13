import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27022/fitness-workout-schedules?authSource=admin';

// Define schema inline for seed script
const WorkoutScheduleSchema = new mongoose.Schema({
  name: String,
  description: String,
  trainerId: { type: String, required: true },
  memberId: String,
  scheduledAt: { type: Date, required: true },
  duration: { type: Number, required: true },
  capacity: Number,
  currentParticipants: { type: Number, default: 0 },
  type: String,
  status: { type: String, default: 'active' },
  approvalStatus: { type: String, default: 'approved' },
  notes: String,
  proposedBy: String,
  approvedAt: Date,
  approvedBy: String,
  rejectedAt: Date,
  rejectedBy: String
}, { timestamps: true, collection: 'workout_schedules' });

const WorkoutSchedule = mongoose.model('WorkoutSchedule', WorkoutScheduleSchema);

// Get trainer user IDs from user-service database
async function getTrainerIds(): Promise<Array<{ id: string; name: string }>> {
  const userDbUri = process.env.USER_SERVICE_MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/fitness-user-db?authSource=admin';
  const userConnection = await mongoose.createConnection(userDbUri);
  
  const UserSchema = new mongoose.Schema({
    email: String,
    role: String,
    fullName: String
  });
  const User = userConnection.model('User', UserSchema);
  
  const trainers = await User.find({ role: 'trainer' }).select('_id fullName').lean();
  await userConnection.close();
  
  return trainers.map(t => ({ id: t._id.toString(), name: t.fullName || 'Unknown Trainer' }));
}

// Helper to get next occurrence of a weekday
function getNextDayOfWeek(dayOfWeek: number, weeksAhead: number = 0): Date {
  const now = new Date();
  const currentDay = now.getDay();
  const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
  const result = new Date(now);
  result.setDate(result.getDate() + daysUntilTarget + (weeksAhead * 7));
  return result;
}

async function seed() {
  console.log('🌱 Seeding Workout Schedule Service...\n');
  
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await WorkoutSchedule.deleteMany({});
  console.log('Cleared existing data\n');

  // Get trainer IDs
  let trainerData: Array<{ id: string; name: string }> = [];
  
  try {
    trainerData = await getTrainerIds();
    console.log(`Found ${trainerData.length} trainers from user-service`);
  } catch (err) {
    console.log('⚠️  Could not connect to user-service DB. Using mock data.');
    const mockTrainers = [
      { name: 'Ana Kovač' },
      { name: 'Marko Novak' },
      { name: 'Luka Horvat' },
      { name: 'Sara Petek' },
      { name: 'Tomaž Zupan' },
      { name: 'Maja Žnidaršič' },
      { name: 'Rok Breznik' }
    ];
    trainerData = mockTrainers.map(t => ({ id: new mongoose.Types.ObjectId().toString(), name: t.name }));
  }

  // Define workout types
  const workoutTypes = [
    { type: 'yoga', name: 'Yoga Session', duration: 60 },
    { type: 'pilates', name: 'Pilates Class', duration: 60 },
    { type: 'spinning', name: 'Spinning', duration: 45 },
    { type: 'hiit', name: 'HIIT Training', duration: 45 },
    { type: 'zumba', name: 'Zumba', duration: 60 },
    { type: 'strength', name: 'Strength Training', duration: 60 },
    { type: 'cardio', name: 'Cardio Workout', duration: 45 },
    { type: 'crossfit', name: 'CrossFit', duration: 60 },
    { type: 'boxing', name: 'Boxing Fitness', duration: 60 },
    { type: 'stretching', name: 'Stretching & Mobility', duration: 30 }
  ];

  // Create schedules for next 2 weeks
  console.log('📅 Creating workout schedules...');
  const schedules: any[] = [];

  for (let week = 0; week < 2; week++) {
    for (let day = 0; day < 7; day++) {
      // 3-5 sessions per day
      const sessionsPerDay = 3 + Math.floor(Math.random() * 3);
      
      for (let s = 0; s < sessionsPerDay; s++) {
        const workout = workoutTypes[Math.floor(Math.random() * workoutTypes.length)];
        const trainer = trainerData[Math.floor(Math.random() * trainerData.length)];
        
        const scheduledAt = getNextDayOfWeek(day, week);
        const hour = 7 + Math.floor(Math.random() * 12); // 7:00 - 19:00
        scheduledAt.setHours(hour, 0, 0, 0);

        const schedule = await WorkoutSchedule.create({
          name: workout.name,
          description: `${workout.name} with ${trainer.name}`,
          trainerId: trainer.id,
          scheduledAt,
          duration: workout.duration,
          capacity: 10 + Math.floor(Math.random() * 15),
          currentParticipants: Math.floor(Math.random() * 10),
          type: workout.type,
          status: 'active',
          approvalStatus: 'approved',
          approvedAt: new Date()
        });
        schedules.push(schedule);
      }
    }
  }

  console.log(`\n✅ Created ${schedules.length} workout schedules`);

  // Create some pending schedules (proposed by trainers, awaiting approval)
  console.log('\n📝 Creating pending schedule proposals...');
  let pendingCount = 0;

  for (let i = 0; i < 5; i++) {
    const workout = workoutTypes[Math.floor(Math.random() * workoutTypes.length)];
    const trainer = trainerData[Math.floor(Math.random() * trainerData.length)];
    
    const scheduledAt = getNextDayOfWeek(Math.floor(Math.random() * 7), 2); // 2 weeks ahead
    scheduledAt.setHours(10 + Math.floor(Math.random() * 8), 0, 0, 0);

    await WorkoutSchedule.create({
      name: workout.name,
      description: `Proposed: ${workout.name} with ${trainer.name}`,
      trainerId: trainer.id,
      scheduledAt,
      duration: workout.duration,
      capacity: 15,
      currentParticipants: 0,
      type: workout.type,
      status: 'active',
      approvalStatus: 'pending',
      proposedBy: trainer.id,
      notes: 'Proposed new class'
    });
    pendingCount++;
  }

  console.log(`✅ Created ${pendingCount} pending schedule proposals`);

  // Show stats
  const typeStats = await WorkoutSchedule.aggregate([
    { $match: { approvalStatus: 'approved' } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  console.log('\n📊 Schedule distribution by type:');
  for (const stat of typeStats) {
    console.log(`  ${stat._id}: ${stat.count} sessions`);
  }

  console.log('\n✅ Seed complete!');
  
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
