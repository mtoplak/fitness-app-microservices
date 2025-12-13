import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.model.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/fitness-user-db?authSource=admin';

async function seed() {
  console.log('🌱 Seeding User Service...\n');
  
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const passwordHash = await bcrypt.hash('password123', 10);

  // Clear existing data
  await User.deleteMany({});
  console.log('Cleared existing users\n');

  // Create Admin
  const admin = await User.create({
    email: 'admin@wiifit.si',
    passwordHash,
    fullName: 'Admin Administrator',
    firstName: 'Admin',
    lastName: 'Administrator',
    address: 'Fitnes centra 1, Ljubljana',
    role: 'admin'
  });
  console.log(`✅ Created admin: ${admin.email}`);

  // Create Trainers (7 total)
  const trainersData = [
    { email: 'ana.kovac@wiifit.si', firstName: 'Ana', lastName: 'Kovač', address: 'Fitness ulica 2, Maribor' },
    { email: 'marko.novak@wiifit.si', firstName: 'Marko', lastName: 'Novak', address: 'Sportna 5, Celje' },
    { email: 'luka.horvat@wiifit.si', firstName: 'Luka', lastName: 'Horvat', address: 'Fitnes cesta 10, Koper' },
    { email: 'sara.petek@wiifit.si', firstName: 'Sara', lastName: 'Petek', address: 'Vadbeni trg 3, Novo Mesto' },
    { email: 'tomaz.zupan@wiifit.si', firstName: 'Tomaž', lastName: 'Zupan', address: 'Fitnes pot 7, Kranj' },
    { email: 'maja.znidarsic@wiifit.si', firstName: 'Maja', lastName: 'Žnidaršič', address: 'Aktivna ulica 12, Velenje' },
    { email: 'rok.breznik@wiifit.si', firstName: 'Rok', lastName: 'Breznik', address: 'Fitnes cesta 8, Ptuj' }
  ];

  const trainers = [];
  for (const t of trainersData) {
    const user = await User.create({
      email: t.email,
      passwordHash,
      fullName: `${t.firstName} ${t.lastName}`,
      firstName: t.firstName,
      lastName: t.lastName,
      address: t.address,
      role: 'trainer'
    });
    trainers.push(user);
    console.log(`✅ Created trainer: ${user.email}`);
  }

  // Create Members (50 users)
  const firstNames = [
    'Miha', 'Jure', 'Petra', 'Nina', 'David', 'Tina', 'Gregor', 'Andreja', 'Bojan', 'Eva',
    'Rok', 'Katarina', 'Dejan', 'Mojca', 'Simon', 'Nataša', 'Aleš', 'Maja', 'Luka', 'Ana',
    'Jan', 'Tjaša', 'Blaž', 'Urška', 'Nejc', 'Pia', 'Matej', 'Tanja', 'Tine', 'Sonja',
    'Gašper', 'Nuša', 'Jani', 'Vesna', 'Anže', 'Anja', 'Žiga', 'Metka', 'Matija', 'Sara',
    'Matic', 'Barbara', 'Aljaž', 'Martina', 'Jaka', 'Marina', 'Sebastjan', 'Karmen', 'Marko', 'Polona'
  ];
  const lastNames = [
    'Novak', 'Horvat', 'Kovačič', 'Krajnc', 'Zupan', 'Pirc', 'Vidmar', 'Kos', 'Golob', 'Mlakar',
    'Kokalj', 'Žnidaršič', 'Petek', 'Koren', 'Korošec', 'Krajnik', 'Šmid', 'Lah', 'Lesjak', 'Jerman',
    'Medved', 'Bajc', 'Zorman', 'Božič', 'Pečnik', 'Rozman', 'Štrukelj', 'Gorenc', 'Vidic', 'Janežič',
    'Javornik', 'Jeršek', 'Hribar', 'Erjavac', 'Hribar', 'Ferjančič', 'Kavčič', 'Miklavčič', 'Zemljič', 'Močnik'
  ];
  const addresses = [
    'Ljubljana, Trubarjeva 12', 'Maribor, Glavni trg 5', 'Celje, Trg celjskih knezov 8',
    'Kranj, Glavni trg 3', 'Koper, Titov trg 1', 'Novo Mesto, Glavni trg 2',
    'Velenje, Titova 1', 'Ptuj, Slomškov trg 25', 'Murska Sobota, Glavna 10', 'Nova Gorica, Bevkov trg 1'
  ];

  const members = [];
  for (let i = 0; i < 50; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const address = addresses[Math.floor(Math.random() * addresses.length)];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
    
    const user = await User.create({
      email,
      passwordHash,
      fullName: `${firstName} ${lastName}`,
      firstName,
      lastName,
      address,
      role: 'member'
    });
    members.push(user);
  }
  console.log(`✅ Created ${members.length} members\n`);

  // Output summary with IDs for other services
  console.log('📋 User IDs for other services:');
  console.log('Admin:', admin._id.toString());
  console.log('Trainers:', trainers.map(t => ({ id: t._id.toString(), name: t.fullName })));
  console.log('Sample Members:', members.slice(0, 5).map(m => ({ id: m._id.toString(), name: m.fullName })));

  console.log(`\n✅ Seed complete!`);
  console.log(`- 1 admin`);
  console.log(`- ${trainers.length} trainers`);
  console.log(`- ${members.length} members`);
  console.log(`Total users: ${1 + trainers.length + members.length}`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
