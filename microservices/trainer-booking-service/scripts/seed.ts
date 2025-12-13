import mongoose from 'mongoose';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://admin:admin123@localhost:27020/fitness_trainer_bookings?authSource=admin';

// Schemas
const TrainerProfileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    fullName: { type: String, required: true },
    email: String,
    trainerType: { type: String, default: 'both' },
    hourlyRate: { type: Number, required: true },
    specializations: [String],
    bio: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'trainers' },
);

const BookingSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    trainerId: { type: String, required: true },
    trainerName: String,
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: { type: String, default: 'confirmed' },
    notes: String,
  },
  { timestamps: true, collection: 'bookings' },
);

const TrainerProfile = mongoose.model('TrainerProfile', TrainerProfileSchema);
const Booking = mongoose.model('Booking', BookingSchema);

interface UserData {
  trainers: Array<{ id: string; name: string; email: string }>;
  members: string[];
}

async function getUserData(): Promise<UserData> {
  const userDbUri =
    process.env.USER_SERVICE_MONGODB_URI ||
    'mongodb://admin:admin123@localhost:27017/fitness_users?authSource=admin';
  const userConnection = await mongoose.createConnection(userDbUri);

  const UserSchema = new mongoose.Schema({
    email: String,
    role: String,
    fullName: String,
  });
  const User = userConnection.model('User', UserSchema);

  const trainerUsers = await User.find({ role: 'trainer' })
    .select('_id fullName email')
    .lean();
  const memberUsers = await User.find({ role: 'member' }).select('_id').lean();
  await userConnection.close();

  return {
    trainers: trainerUsers.map((t) => ({
      id: t._id.toString(),
      name: t.fullName || 'Unknown Trainer',
      email: (t as any).email || '',
    })),
    members: memberUsers.map((m) => m._id.toString()),
  };
}

async function seed() {
  console.log('🌱 Seeding Trainer Booking Service (C#)...\n');

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await TrainerProfile.deleteMany({});
  await Booking.deleteMany({});
  console.log('Cleared existing data\n');

  // Get user data
  let userData: UserData;
  try {
    userData = await getUserData();
    console.log(
      `Found ${userData.trainers.length} trainers and ${userData.members.length} members from user-service`,
    );
  } catch (error) {
    console.log('⚠️ Could not connect to user-service, using placeholder data');
    userData = {
      trainers: [
        { id: 'trainer1', name: 'Ana Kovač', email: 'ana.kovac@wiifit.si' },
        { id: 'trainer2', name: 'Marko Novak', email: 'marko.novak@wiifit.si' },
        { id: 'trainer3', name: 'Luka Horvat', email: 'luka.horvat@wiifit.si' },
      ],
      members: Array.from({ length: 20 }, (_, i) => `member${i + 1}`),
    };
  }

  // Create trainer profiles with different specializations
  const trainerData = [
    {
      trainerType: 'both',
      hourlyRate: 35,
      specializations: ['Moč', 'Funkcijski trening'],
      bio: 'Certificirana osebna trenerka z 5+ leti izkušenj.',
    },
    {
      trainerType: 'personal',
      hourlyRate: 40,
      specializations: ['CrossFit', 'HIIT', 'Vzdržljivost'],
      bio: 'Specializiran za visoko intenzivne treninge.',
    },
    {
      trainerType: 'group',
      hourlyRate: 30,
      specializations: ['Joga', 'Pilates', 'Raztezanje'],
      bio: 'Inštruktor skupinskih vadb in joge.',
    },
    {
      trainerType: 'both',
      hourlyRate: 45,
      specializations: ['Bodybuilding', 'Prehrana'],
      bio: 'Tekmovalni bodybuilder in prehranski svetovalec.',
    },
    {
      trainerType: 'personal',
      hourlyRate: 38,
      specializations: ['Kardio', 'Hujšanje'],
      bio: 'Specializirana za programe hujšanja.',
    },
    {
      trainerType: 'both',
      hourlyRate: 42,
      specializations: ['Boks', 'MMA', 'Kickboks'],
      bio: 'Trener borilnih veščin.',
    },
    {
      trainerType: 'group',
      hourlyRate: 32,
      specializations: ['Zumba', 'Aerobika', 'Ples'],
      bio: 'Plesni inštruktor in zumba trener.',
    },
  ];

  console.log('\n📋 Creating trainer profiles...');
  const trainerProfiles: any[] = [];
  for (let i = 0; i < userData.trainers.length; i++) {
    const user = userData.trainers[i];
    const data = trainerData[i % trainerData.length];

    const profile = await TrainerProfile.create({
      userId: user.id,
      fullName: user.name,
      email: user.email,
      ...data,
    });
    trainerProfiles.push(profile);
    console.log(
      `✅ Created profile: ${profile.fullName} - ${profile.hourlyRate}€/h (${profile.trainerType})`,
    );
  }

  // Create bookings
  console.log('\n📅 Creating bookings...');
  let bookingCount = 0;
  const now = new Date();

  for (const memberId of userData.members.slice(0, 30)) {
    // Each member gets 1-3 bookings
    const numBookings = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < numBookings; i++) {
      const trainer =
        trainerProfiles[Math.floor(Math.random() * trainerProfiles.length)];
      const daysFromNow = Math.floor(Math.random() * 21) - 7; // -7 to +14 days
      const hour = 9 + Math.floor(Math.random() * 10); // 9:00 to 19:00

      const startTime = new Date(now);
      startTime.setDate(startTime.getDate() + daysFromNow);
      startTime.setHours(hour, 0, 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      const notes = [
        'Fokus na moč',
        'Priprava na tekmovanje',
        'Rehabilitacija po poškodbi',
        'Začetniški trening',
        'Napredni trening',
        undefined,
      ];

      await Booking.create({
        userId: memberId,
        trainerId: trainer.userId,
        trainerName: trainer.fullName,
        startTime,
        endTime,
        status: daysFromNow < 0 ? 'completed' : 'confirmed',
        notes: notes[Math.floor(Math.random() * notes.length)],
      });
      bookingCount++;
    }
  }

  console.log(`\n✅ Created ${bookingCount} trainer bookings`);

  // Statistics
  const stats = await Booking.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  console.log('\n📊 Booking status distribution:');
  for (const stat of stats) {
    console.log(`  ${stat._id}: ${stat.count}`);
  }

  console.log('\n✅ Seed complete!');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
