import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27019/fitness-subscriptions?authSource=admin';

// Define schemas inline for seed script
const SubscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  durationDays: { type: Number, required: true },
  accessLevel: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  features: { type: [String], default: [] }
}, { timestamps: true, collection: 'subscription_plans' });

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
  status: { type: String, default: 'active' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  autoRenew: { type: Boolean, default: true },
  cancelledAt: Date,
  cancelReason: String,
  lastRenewalDate: Date,
  renewalCount: { type: Number, default: 0 }
}, { timestamps: true, collection: 'subscriptions' });

const PaymentSchema = new mongoose.Schema({
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  userId: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, default: 'credit_card' },
  status: { type: String, default: 'completed' },
  transactionId: String,
  paymentDate: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'payments' });

const SubscriptionPlan = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);
const Subscription = mongoose.model('Subscription', SubscriptionSchema);
const Payment = mongoose.model('Payment', PaymentSchema);

// Get member user IDs from user-service database
async function getMemberUserIds(): Promise<string[]> {
  const userDbUri = process.env.USER_SERVICE_MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/fitness-user-db?authSource=admin';
  const userConnection = await mongoose.createConnection(userDbUri);
  
  const UserSchema = new mongoose.Schema({
    email: String,
    role: String,
    fullName: String
  });
  const User = userConnection.model('User', UserSchema);
  
  const members = await User.find({ role: 'member' }).select('_id').lean();
  await userConnection.close();
  
  return members.map(m => m._id.toString());
}

async function seed() {
  console.log('🌱 Seeding Subscription Service...\n');
  
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await SubscriptionPlan.deleteMany({});
  await Subscription.deleteMany({});
  await Payment.deleteMany({});
  console.log('Cleared existing data\n');

  // Create Subscription Plans
  const plansData = [
    {
      name: 'Začetni Paket',
      description: 'Osnovni dostop do telovadnice',
      price: 29,
      durationDays: 30,
      accessLevel: 1,
      features: ['Dostop do telovadnice', 'Garderobne omarice', 'Tuši']
    },
    {
      name: 'Premium Paket',
      description: 'Polni dostop s skupinskimi vadbami',
      price: 49,
      durationDays: 30,
      accessLevel: 2,
      features: ['Vse iz Začetnega paketa', 'Skupinske vadbe', 'Savna', 'Parking']
    },
    {
      name: 'Elite Paket',
      description: 'VIP dostop z osebnimi treningi',
      price: 55,
      durationDays: 30,
      accessLevel: 3,
      features: ['Vse iz Premium paketa', '2x osebni trening/mesec', 'Prehrana svetovanje', 'VIP garderoba']
    }
  ];

  const plans = [];
  for (const plan of plansData) {
    const p = await SubscriptionPlan.create(plan);
    plans.push(p);
    console.log(`✅ Created plan: ${p.name} - ${p.price}€/mesec`);
  }

  // Get member IDs
  let memberIds: string[] = [];
  try {
    memberIds = await getMemberUserIds();
    console.log(`\nFound ${memberIds.length} members from user-service`);
  } catch (err) {
    console.log('\n⚠️  Could not connect to user-service DB. Using mock user IDs.');
    // Generate mock user IDs if user-service DB not available
    for (let i = 0; i < 50; i++) {
      memberIds.push(new mongoose.Types.ObjectId().toString());
    }
  }

  // Create subscriptions for members
  const now = new Date();
  let subscriptionCount = 0;

  for (const userId of memberIds) {
    // Random package assignment (weighted)
    const rand = Math.random();
    let planIdx = 0;
    if (rand < 0.5) planIdx = 0;      // 50% Začetni
    else if (rand < 0.85) planIdx = 1; // 35% Premium
    else planIdx = 2;                  // 15% Elite

    const plan = plans[planIdx];

    // Random start date (within last 3 months)
    const startOffset = Math.floor(Math.random() * 90);
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - startOffset);

    // End date
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const subscription = await Subscription.create({
      userId,
      planId: plan._id,
      status: endDate > now ? 'active' : 'expired',
      startDate,
      endDate,
      autoRenew: Math.random() > 0.2 // 80% auto-renew
    });

    // Create payment record
    await Payment.create({
      subscriptionId: subscription._id,
      userId,
      amount: plan.price,
      paymentMethod: Math.random() > 0.3 ? 'credit_card' : 'paypal',
      status: 'completed',
      transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      paymentDate: startDate
    });

    subscriptionCount++;
  }

  console.log(`\n✅ Created ${subscriptionCount} subscriptions with payments`);

  // Show distribution
  const stats = await Subscription.aggregate([
    { $group: { _id: '$planId', count: { $sum: 1 } } }
  ]);
  
  console.log('\n📊 Subscription distribution:');
  for (const stat of stats) {
    const plan = plans.find(p => p._id.toString() === stat._id.toString());
    console.log(`  ${plan?.name || 'Unknown'}: ${stat.count} members`);
  }

  console.log('\n✅ Seed complete!');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
