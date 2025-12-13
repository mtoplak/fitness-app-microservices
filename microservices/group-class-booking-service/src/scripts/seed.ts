import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27018/fitness-group-bookings?authSource=admin';

// Define schemas inline for seed script
const GroupClassSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  trainerId: { type: String, required: true },
  scheduledAt: { type: Date, required: true },
  duration: { type: Number, required: true },
  capacity: { type: Number, required: true },
  currentParticipants: { type: Number, default: 0 },
  status: { type: String, default: 'active' }
}, { timestamps: true, collection: 'group_classes' });

const BookingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'GroupClass', required: true },
  status: { type: String, default: 'confirmed' },
  bookedAt: { type: Date, default: Date.now },
  cancelledAt: Date,
  reminderSent: { type: Boolean, default: false }
}, { timestamps: true, collection: 'bookings' });

const GroupClass = mongoose.model('GroupClass', GroupClassSchema);
const Booking = mongoose.model('Booking', BookingSchema);

// Get trainer and member user IDs from user-service database
async function getUserIds(): Promise<{ trainers: Array<{ id: string; name: string }>; members: string[] }> {
  const userDbUri = process.env.USER_SERVICE_MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/fitness-user-db?authSource=admin';
  const userConnection = await mongoose.createConnection(userDbUri);
  
  const UserSchema = new mongoose.Schema({
    email: String,
    role: String,
    fullName: String
  });
  const User = userConnection.model('User', UserSchema);
  
  const trainerUsers = await User.find({ role: 'trainer' }).select('_id fullName').lean();
  const memberUsers = await User.find({ role: 'member' }).select('_id').lean();
  await userConnection.close();
  
  return {
    trainers: trainerUsers.map(t => ({ id: t._id.toString(), name: t.fullName || 'Unknown Trainer' })),
    members: memberUsers.map(m => m._id.toString())
  };
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
  console.log('🌱 Seeding Group Class Booking Service...\n');
  
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await GroupClass.deleteMany({});
  await Booking.deleteMany({});
  console.log('Cleared existing data\n');

  // Get user IDs
  let trainerData: Array<{ id: string; name: string }> = [];
  let memberIds: string[] = [];
  
  try {
    const users = await getUserIds();
    trainerData = users.trainers;
    memberIds = users.members;
    console.log(`Found ${trainerData.length} trainers and ${memberIds.length} members from user-service`);
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
    for (let i = 0; i < 50; i++) {
      memberIds.push(new mongoose.Types.ObjectId().toString());
    }
  }

  // Define class templates
  const classTemplates = [
    { name: 'Jutranji HIIT', capacity: 16, duration: 45, schedule: [[1, '07:00'], [3, '07:00']], trainerIdx: 0 },
    { name: 'Joga za začetnike', capacity: 20, duration: 60, schedule: [[2, '18:00'], [4, '18:00']], trainerIdx: 1 },
    { name: 'Krožni trening', capacity: 12, duration: 45, schedule: [[5, '17:30'], [6, '10:00']], trainerIdx: 2 },
    { name: 'Pilates', capacity: 14, duration: 60, schedule: [[1, '19:00'], [3, '19:00']], trainerIdx: 3 },
    { name: 'Zumba', capacity: 22, duration: 45, schedule: [[2, '19:15'], [5, '19:00']], trainerIdx: 4 },
    { name: 'Spinning', capacity: 18, duration: 45, schedule: [[1, '06:30'], [4, '06:30']], trainerIdx: 5 },
    { name: 'Boks kondicija', capacity: 16, duration: 60, schedule: [[2, '20:15'], [4, '20:15']], trainerIdx: 6 },
    { name: 'Mobility & Stretch', capacity: 20, duration: 45, schedule: [[0, '17:00'], [6, '11:00']], trainerIdx: 0 },
    { name: 'Core Blast', capacity: 15, duration: 30, schedule: [[3, '12:15'], [5, '12:15']], trainerIdx: 1 },
    { name: 'Dance Cardio', capacity: 24, duration: 60, schedule: [[6, '18:00']], trainerIdx: 2 },
    { name: 'CrossFit Intro', capacity: 12, duration: 60, schedule: [[1, '17:00'], [3, '17:00'], [5, '09:00']], trainerIdx: 3 }
  ];

  // Create classes for next 2 weeks
  const classes: any[] = [];
  console.log('📅 Creating group classes...');
  
  for (const template of classTemplates) {
    const trainer = trainerData[template.trainerIdx % trainerData.length];
    
    for (let week = 0; week < 2; week++) {
      for (const [dayOfWeek, time] of template.schedule) {
        const scheduledAt = getNextDayOfWeek(dayOfWeek as number, week);
        const [hours, minutes] = (time as string).split(':').map(Number);
        scheduledAt.setHours(hours, minutes, 0, 0);

        const groupClass = await GroupClass.create({
          name: template.name,
          description: `${template.name} with ${trainer.name}`,
          trainerId: trainer.id,
          scheduledAt,
          duration: template.duration,
          capacity: template.capacity,
          currentParticipants: 0,
          status: 'active'
        });
        classes.push(groupClass);
      }
    }
    console.log(`  ✅ Created ${template.name} classes`);
  }

  console.log(`\n✅ Created ${classes.length} group class instances`);

  // Create sample bookings
  console.log('\n📝 Creating sample bookings...');
  let bookingCount = 0;

  for (const groupClass of classes) {
    // Random number of participants (0 to 80% of capacity)
    const numParticipants = Math.floor(Math.random() * (groupClass.capacity * 0.8));
    
    // Shuffle member IDs and take first N
    const shuffledMembers = [...memberIds].sort(() => Math.random() - 0.5);
    const participants = shuffledMembers.slice(0, numParticipants);

    for (const userId of participants) {
      await Booking.create({
        userId,
        classId: groupClass._id,
        status: 'confirmed',
        bookedAt: new Date(),
        reminderSent: false
      });
      bookingCount++;
    }

    // Update class participant count
    await GroupClass.updateOne(
      { _id: groupClass._id },
      { currentParticipants: numParticipants }
    );
  }

  console.log(`\n✅ Created ${bookingCount} class bookings`);

  // Show stats
  const totalCapacity = classes.reduce((sum, c) => sum + c.capacity, 0);
  console.log('\n📊 Statistics:');
  console.log(`  Total classes: ${classes.length}`);
  console.log(`  Total capacity: ${totalCapacity}`);
  console.log(`  Total bookings: ${bookingCount}`);
  console.log(`  Average fill rate: ${((bookingCount / totalCapacity) * 100).toFixed(1)}%`);

  console.log('\n✅ Seed complete!');
  
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
