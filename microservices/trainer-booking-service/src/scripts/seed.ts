import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27021/fitness-trainer-bookings?authSource=admin';

// Define schemas inline for seed script
const TrainerSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  bio: String,
  specializations: { type: [String], default: [] },
  photoUrl: String,
  rating: { type: Number, default: 0 },
  totalSessions: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true, collection: 'trainers' });

const TrainerAvailabilitySchema = new mongoose.Schema({
  trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true },
  dayOfWeek: { type: Number, required: true }, // 0-6, Sunday-Saturday
  startTime: { type: String, required: true }, // "09:00"
  endTime: { type: String, required: true },   // "17:00"
  isRecurring: { type: Boolean, default: true }
}, { timestamps: true, collection: 'trainer_availabilities' });

const TrainerBookingSchema = new mongoose.Schema({
  trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true },
  userId: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, default: 'confirmed' }, // confirmed, cancelled, completed
  notes: String,
  cancelReason: String
}, { timestamps: true, collection: 'trainer_bookings' });

const Trainer = mongoose.model('Trainer', TrainerSchema);
const TrainerAvailability = mongoose.model('TrainerAvailability', TrainerAvailabilitySchema);
const TrainerBooking = mongoose.model('TrainerBooking', TrainerBookingSchema);

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
    trainers: trainerUsers.map(t => ({ id: t._id.toString(), name: t.fullName })),
    members: memberUsers.map(m => m._id.toString())
  };
}

async function seed() {
  console.log('🌱 Seeding Trainer Booking Service...\n');
  
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Trainer.deleteMany({});
  await TrainerAvailability.deleteMany({});
  await TrainerBooking.deleteMany({});
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
    // Generate mock data
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

  // Create trainer profiles
  const specializations = [
    ['Strength Training', 'HIIT', 'Weight Loss'],
    ['Personal Training', 'Bodybuilding'],
    ['Group Classes', 'Cardio', 'Dance'],
    ['Yoga', 'Pilates', 'Flexibility'],
    ['CrossFit', 'Functional Training'],
    ['Zumba', 'Aerobics', 'Dance Fitness'],
    ['Boxing', 'MMA', 'Self-defense']
  ];

  const bios = [
    'Certified personal trainer with 5+ years experience.',
    'Former athlete specializing in strength and conditioning.',
    'Group fitness expert and dance instructor.',
    'Yoga and mindfulness practitioner.',
    'CrossFit Level 2 trainer.',
    'Zumba certified instructor with passion for dance.',
    'Combat sports expert and fitness coach.'
  ];

  const trainers = [];
  for (let i = 0; i < trainerData.length; i++) {
    const trainer = await Trainer.create({
      userId: trainerData[i].id,
      name: trainerData[i].name,
      bio: bios[i % bios.length],
      specializations: specializations[i % specializations.length],
      rating: 4 + Math.random(),
      totalSessions: Math.floor(Math.random() * 200) + 50,
      isActive: true
    });
    trainers.push(trainer);
    console.log(`✅ Created trainer profile: ${trainer.name}`);
  }

  // Create availability for each trainer
  console.log('\n📅 Creating trainer availability...');
  for (const trainer of trainers) {
    // Monday to Friday availability
    for (let day = 1; day <= 5; day++) {
      await TrainerAvailability.create({
        trainerId: trainer._id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        isRecurring: true
      });
    }
    // Saturday half-day
    await TrainerAvailability.create({
      trainerId: trainer._id,
      dayOfWeek: 6,
      startTime: '09:00',
      endTime: '13:00',
      isRecurring: true
    });
    console.log(`  ✅ Availability set for ${trainer.name}`);
  }

  // Create sample bookings
  console.log('\n📝 Creating sample bookings...');
  const now = new Date();
  let bookingCount = 0;

  for (let i = 0; i < 30; i++) {
    const trainer = trainers[Math.floor(Math.random() * trainers.length)];
    const userId = memberIds[Math.floor(Math.random() * memberIds.length)];
    
    // Random date within -7 to +14 days
    const daysFromNow = Math.floor(Math.random() * 21) - 7;
    const startTime = new Date(now);
    startTime.setDate(startTime.getDate() + daysFromNow);
    startTime.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    await TrainerBooking.create({
      trainerId: trainer._id,
      userId,
      startTime,
      endTime,
      status: daysFromNow < 0 ? 'completed' : 'confirmed',
      notes: Math.random() > 0.5 ? 'Focus on strength training' : undefined
    });
    bookingCount++;
  }

  console.log(`\n✅ Created ${bookingCount} trainer bookings`);
  console.log('\n✅ Seed complete!');
  
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
