import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27019/fitness-subscriptions?authSource=admin';

// Define schemas inline for seed script
const PlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  durationDays: { type: Number, required: true },
  accessLevel: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  features: { type: [String], default: [] },
}, { timestamps: true, collection: 'subscription_plans' });

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  planName: String,
  status: { type: String, default: 'active' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  autoRenew: { type: Boolean, default: true },
  cancelledAt: Date,
  cancelReason: String,
}, { timestamps: true, collection: 'subscriptions' });

const PaymentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  amount: { type: Number, required: true },
  status: { type: String, default: 'completed' },
  paymentMethod: { type: String, default: 'credit_card' },
  transactionId: String,
  paymentDate: { type: Date, default: Date.now },
}, { timestamps: true, collection: 'payments' });

const Plan = mongoose.model('Plan', PlanSchema);
const Subscription = mongoose.model('Subscription', SubscriptionSchema);
const Payment = mongoose.model('Payment', PaymentSchema);

// Get member user IDs from user-service database
async function getMemberUserIds(): Promise<string[]> {
  const userDbUri = process.env.USER_SERVICE_MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/fitness_users?authSource=admin';
  const userConnection = await mongoose.createConnection(userDbUri);
  
  const UserSchema = new mongoose.Schema({ role: String });
  const User = userConnection.model('User', UserSchema);
  
  const members = await User.find({ role: 'member' }).select('_id').lean();
  await userConnection.close();
  
  return members.map(m => m._id.toString());
}

async function seed() {
  console.log('🌱 Seeding Subscription Service (C#)...\n');
  
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Plan.deleteMany({});
  await Subscription.deleteMany({});
  await Payment.deleteMany({});
  console.log('Cleared existing data\n');

  // Create plans
  const plansData = [
    {
      name: 'Začetni Paket',
      description: 'Osnovni dostop do telovadnice',
      price: 29,
      durationDays: 30,
      accessLevel: 1,
      isActive: true,
      features: ['Dostop do telovadnice', 'Garderobne omarice', 'Tuši']
    },
    {
      name: 'Premium Paket',
      description: 'Polni dostop s skupinskimi vadbami',
      price: 49,
      durationDays: 30,
      accessLevel: 2,
      isActive: true,
      features: ['Vse iz Začetnega paketa', 'Skupinske vadbe', 'Savna', 'Parking']
    },
    {
      name: 'Elite Paket',
      description: 'VIP dostop z osebnimi treningi',
      price: 55,
      durationDays: 30,
      accessLevel: 3,
      isActive: true,
      features: ['Vse iz Premium paketa', '2x osebni trening/mesec', 'Prehrana svetovanje', 'VIP garderoba']
    }
  ];

  const plans: any[] = [];
  for (const planData of plansData) {
    const plan = await Plan.create(planData);
    plans.push(plan);
    console.log(`✅ Created plan: ${plan.name} - ${plan.price}€/mesec`);
  }

  // Get member IDs
  let memberIds: string[] = [];
  try {
    memberIds = await getMemberUserIds();
    console.log(`\nFound ${memberIds.length} members from user-service`);
  } catch (error) {
    console.log('\n⚠️ Could not connect to user-service, using placeholder IDs');
    memberIds = Array.from({ length: 50 }, (_, i) => `member${i + 1}`);
  }

  // Create subscriptions and payments for members
  console.log('\n📝 Creating subscriptions and payments...');
  let subscriptionCount = 0;
  
  for (const memberId of memberIds) {
    const plan = plans[Math.floor(Math.random() * plans.length)];
    const daysAgo = Math.floor(Math.random() * 25);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const subscription = await Subscription.create({
      userId: memberId,
      planId: plan._id,
      planName: plan.name,
      status: 'active',
      startDate,
      endDate,
      autoRenew: Math.random() > 0.2
    });

    await Payment.create({
      userId: memberId,
      subscriptionId: subscription._id,
      amount: plan.price,
      status: 'completed',
      paymentMethod: Math.random() > 0.3 ? 'credit_card' : 'paypal',
      transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      paymentDate: startDate
    });

    subscriptionCount++;
  }

  console.log(`\n✅ Created ${subscriptionCount} subscriptions with payments`);

  // Statistics
  const planStats = await Subscription.aggregate([
    { $group: { _id: '$planName', count: { $sum: 1 } } }
  ]);
  console.log('\n📊 Subscription distribution:');
  for (const stat of planStats) {
    console.log(`  ${stat._id}: ${stat.count} members`);
  }

  console.log('\n✅ Seed complete!');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
