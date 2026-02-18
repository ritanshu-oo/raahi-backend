import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Activity from '../models/Activity';
import Trip from '../models/Trip';
import User from '../models/User';
import ChatRoom from '../models/ChatRoom';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/raahi';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clean previous seed data
  await User.deleteMany({ firebaseUid: /^seed_/ });
  await Activity.deleteMany({ mood: { $exists: true } }); // seed activities have mood
  await Trip.deleteMany({ country: 'India', userId: { $exists: true } });
  console.log('Cleaned old seed data');

  // ── Seed Users ──
  const [priya, arjun, meera] = await User.create([
    {
      firebaseUid: 'seed_user_priya_001',
      authProvider: 'phone',
      phone: '+919876500001',
      name: 'Priya Sharma',
      gender: 'female',
      languages: ['Hindi', 'English'],
      travelStyle: 'explorer',
      interests: ['Food', 'Culture', 'Wellness'],
      bio: 'Solo traveler exploring India one city at a time. Love sunsets and street food!',
      profileSetupStep: 4,
      isProfileComplete: true,
      trustScore: 4.2,
      activitiesHostedCount: 5,
      activitiesJoinedCount: 12,
      verification: { status: 'verified' },
    },
    {
      firebaseUid: 'seed_user_arjun_002',
      authProvider: 'phone',
      phone: '+919876500002',
      name: 'Arjun Patel',
      gender: 'male',
      languages: ['Hindi', 'English', 'Gujarati'],
      travelStyle: 'backpacker',
      interests: ['Adventure', 'Party', 'Food'],
      bio: 'Backpacker and foodie. Always up for an adventure or a good party!',
      profileSetupStep: 4,
      isProfileComplete: true,
      trustScore: 3.8,
      activitiesHostedCount: 3,
      activitiesJoinedCount: 8,
      verification: { status: 'verified' },
    },
    {
      firebaseUid: 'seed_user_meera_003',
      authProvider: 'phone',
      phone: '+919876500003',
      name: 'Meera Iyer',
      gender: 'female',
      languages: ['Tamil', 'English', 'Hindi'],
      travelStyle: 'digital-nomad',
      interests: ['Coworking', 'Culture', 'Photography'],
      bio: 'Digital nomad working remotely from cafes across India. Coffee addict.',
      profileSetupStep: 4,
      isProfileComplete: true,
      trustScore: 4.5,
      activitiesHostedCount: 7,
      activitiesJoinedCount: 15,
      verification: { status: 'verified' },
    },
  ]);

  console.log(`Users: ${priya.name}, ${arjun.name}, ${meera.name}`);

  // ── Seed Trips ──
  const [priyaGoa, arjunMumbai, meeraBangalore, arjunDelhi] = await Trip.create([
    {
      userId: priya._id,
      city: 'Goa', state: 'Goa', country: 'India',
      location: { type: 'Point', coordinates: [73.8278, 15.4909] },
      startDate: new Date('2026-02-20'), endDate: new Date('2026-02-28'),
      mood: 'chill', status: 'upcoming',
    },
    {
      userId: arjun._id,
      city: 'Mumbai', state: 'Maharashtra', country: 'India',
      location: { type: 'Point', coordinates: [72.8777, 19.0760] },
      startDate: new Date('2026-02-19'), endDate: new Date('2026-02-25'),
      mood: 'foodie', status: 'upcoming',
    },
    {
      userId: meera._id,
      city: 'Bangalore', state: 'Karnataka', country: 'India',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] },
      startDate: new Date('2026-02-18'), endDate: new Date('2026-03-01'),
      mood: 'workation', status: 'active',
    },
    {
      userId: arjun._id,
      city: 'Delhi', state: 'Delhi', country: 'India',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
      startDate: new Date('2026-03-01'), endDate: new Date('2026-03-05'),
      mood: 'cultural', status: 'upcoming',
    },
  ]);

  console.log(`Trips: Goa, Mumbai, Bangalore, Delhi`);

  // Helper to create activity + chat room
  async function createActivity(data: any) {
    const activity = await Activity.create(data);
    const chatRoom = await ChatRoom.create({
      activityId: activity._id,
      type: 'group',
      participants: [data.hostId],
    });
    activity.chatRoomId = chatRoom._id;
    await activity.save();
    return activity;
  }

  // ── Activities ──

  // 1. FOOD - Mumbai Street Food
  const a1 = await createActivity({
    hostId: arjun._id,
    tripId: arjunMumbai._id,
    title: 'Mumbai Street Food Crawl',
    description: 'Hit the best street food joints in South Mumbai — vada pav at Ashok, pav bhaji at Juhu, and cutting chai at Irani cafes. 3 hours of pure food heaven!',
    emoji: '🍕',
    categories: ['Food'],
    city: 'Mumbai',
    venueName: 'CST Station Area',
    venueAddress: 'Chhatrapati Shivaji Terminus, Fort, Mumbai',
    location: { type: 'Point', coordinates: [72.8347, 18.9398] },
    dateTime: new Date('2026-02-22T18:00:00'),
    duration: 180,
    maxParticipants: 8,
    participants: [{ userId: arjun._id, joinedAt: new Date(), status: 'confirmed' }],
    genderCount: { male: 1, female: 0, other: 0 },
    mood: 'foodie',
    status: 'active',
  });

  // 2. ADVENTURE - Goa Water Sports
  const a2 = await createActivity({
    hostId: priya._id,
    tripId: priyaGoa._id,
    title: 'Kayaking at Palolem',
    description: 'Morning kayaking along the coast of Palolem. We\'ll paddle past dolphin island! No experience needed.',
    emoji: '🏔',
    categories: ['Adventure'],
    city: 'Goa',
    venueName: 'Palolem Beach',
    venueAddress: 'Palolem, Canacona, South Goa',
    location: { type: 'Point', coordinates: [74.0230, 15.0100] },
    dateTime: new Date('2026-02-23T07:00:00'),
    duration: 120,
    maxParticipants: 6,
    participants: [{ userId: priya._id, joinedAt: new Date(), status: 'confirmed' }],
    genderCount: { male: 0, female: 1, other: 0 },
    mood: 'adventure',
    status: 'active',
  });

  // 3. PARTY - Goa Beach Party
  const a3 = await createActivity({
    hostId: priya._id,
    tripId: priyaGoa._id,
    title: 'Beach Bonfire Night',
    description: 'Bonfire on Arambol beach with music, drinks, and good vibes. Bring your guitar if you have one!',
    emoji: '🎉',
    categories: ['Party'],
    city: 'Goa',
    venueName: 'Arambol Beach',
    venueAddress: 'Arambol, North Goa',
    location: { type: 'Point', coordinates: [73.6867, 15.6868] },
    dateTime: new Date('2026-02-24T20:00:00'),
    duration: 240,
    maxParticipants: 12,
    participants: [{ userId: priya._id, joinedAt: new Date(), status: 'confirmed' }],
    genderCount: { male: 0, female: 1, other: 0 },
    mood: 'party',
    status: 'active',
  });

  // 4. COWORKING - Bangalore Cafe
  const a4 = await createActivity({
    hostId: meera._id,
    tripId: meeraBangalore._id,
    title: 'Cowork at Third Wave Coffee',
    description: 'Working from Third Wave Coffee in Indiranagar. Good wifi, great coffee. Let\'s be productive together!',
    emoji: '💻',
    categories: ['Coworking'],
    city: 'Bangalore',
    venueName: 'Third Wave Coffee',
    venueAddress: '100 Feet Road, Indiranagar, Bangalore',
    location: { type: 'Point', coordinates: [77.6408, 12.9784] },
    dateTime: new Date('2026-02-21T10:00:00'),
    duration: 300,
    maxParticipants: 5,
    participants: [{ userId: meera._id, joinedAt: new Date(), status: 'confirmed' }],
    genderCount: { male: 0, female: 1, other: 0 },
    mood: 'workation',
    status: 'active',
  });

  // 5. CULTURE - Delhi Heritage Walk
  const a5 = await createActivity({
    hostId: arjun._id,
    tripId: arjunDelhi._id,
    title: 'Old Delhi Heritage Walk',
    description: 'Walk through the lanes of Chandni Chowk, visit Jama Masjid, Red Fort, and hidden havelis. History comes alive!',
    emoji: '🎭',
    categories: ['Culture'],
    city: 'Delhi',
    venueName: 'Chandni Chowk Metro',
    venueAddress: 'Chandni Chowk, Old Delhi',
    location: { type: 'Point', coordinates: [77.2311, 28.6506] },
    dateTime: new Date('2026-03-02T09:00:00'),
    duration: 180,
    maxParticipants: 8,
    participants: [{ userId: arjun._id, joinedAt: new Date(), status: 'confirmed' }],
    genderCount: { male: 1, female: 0, other: 0 },
    mood: 'cultural',
    status: 'active',
  });

  // 6. WELLNESS - Goa Yoga
  const a6 = await createActivity({
    hostId: priya._id,
    tripId: priyaGoa._id,
    title: 'Sunrise Yoga on the Beach',
    description: 'Start your day with yoga at sunrise on Palolem beach. All levels welcome. Mats provided. Bring your own water.',
    emoji: '🧘',
    categories: ['Wellness'],
    city: 'Goa',
    venueName: 'Palolem Beach',
    venueAddress: 'South end, Palolem Beach, Goa',
    location: { type: 'Point', coordinates: [74.0210, 15.0090] },
    dateTime: new Date('2026-02-25T06:00:00'),
    duration: 90,
    maxParticipants: 10,
    participants: [{ userId: priya._id, joinedAt: new Date(), status: 'confirmed' }],
    genderCount: { male: 0, female: 1, other: 0 },
    mood: 'chill',
    status: 'active',
  });

  // 7. FOOD - Bangalore Dosa Tour
  const a7 = await createActivity({
    hostId: meera._id,
    tripId: meeraBangalore._id,
    title: 'Best Dosa Spots in Bangalore',
    description: 'Join me for a dosa crawl across Bangalore! From MTR to CTR to Vidyarthi Bhavan — crispy masala dosa heaven.',
    emoji: '🍕',
    categories: ['Food'],
    city: 'Bangalore',
    venueName: 'MTR, Lalbagh Road',
    venueAddress: 'Lalbagh Road, Basavanagudi, Bangalore',
    location: { type: 'Point', coordinates: [77.5838, 12.9507] },
    dateTime: new Date('2026-02-22T08:00:00'),
    duration: 150,
    maxParticipants: 6,
    participants: [{ userId: meera._id, joinedAt: new Date(), status: 'confirmed' }],
    genderCount: { male: 0, female: 1, other: 0 },
    mood: 'foodie',
    status: 'active',
  });

  // 8. ADVENTURE - Mumbai Hiking
  const a8 = await createActivity({
    hostId: arjun._id,
    tripId: arjunMumbai._id,
    title: 'Sunrise Trek to Kalavantin Durg',
    description: 'Early morning trek to Kalavantin Durg near Panvel. Stunning views of the Sahyadris at sunrise. Moderate difficulty.',
    emoji: '🏔',
    categories: ['Adventure'],
    city: 'Mumbai',
    venueName: 'Panvel Station',
    venueAddress: 'Panvel Railway Station, Navi Mumbai',
    location: { type: 'Point', coordinates: [73.1094, 18.9894] },
    dateTime: new Date('2026-02-23T04:30:00'),
    duration: 360,
    maxParticipants: 8,
    participants: [
      { userId: arjun._id, joinedAt: new Date(), status: 'confirmed' },
      { userId: meera._id, joinedAt: new Date(), status: 'confirmed' },
    ],
    genderCount: { male: 1, female: 1, other: 0 },
    mood: 'adventure',
    status: 'active',
  });

  // 9. CULTURE - Bangalore Art Walk
  const a9 = await createActivity({
    hostId: meera._id,
    tripId: meeraBangalore._id,
    title: 'Street Art Walk in Malleshwaram',
    description: 'Discover hidden street art, murals, and graffiti in the old lanes of Malleshwaram. Photography welcome!',
    emoji: '🎭',
    categories: ['Culture'],
    city: 'Bangalore',
    venueName: 'Malleshwaram Circle',
    venueAddress: 'Sampige Road, Malleshwaram, Bangalore',
    location: { type: 'Point', coordinates: [77.5707, 13.0035] },
    dateTime: new Date('2026-02-24T16:00:00'),
    duration: 120,
    maxParticipants: 8,
    participants: [{ userId: meera._id, joinedAt: new Date(), status: 'confirmed' }],
    genderCount: { male: 0, female: 1, other: 0 },
    mood: 'cultural',
    status: 'active',
  });

  // 10. PARTY - Mumbai Rooftop
  const a10 = await createActivity({
    hostId: arjun._id,
    tripId: arjunMumbai._id,
    title: 'Rooftop Drinks at Aer',
    description: 'Sunset drinks at Aer, the rooftop bar at Four Seasons. Amazing views of the Mumbai skyline. Smart casual.',
    emoji: '🎉',
    categories: ['Party'],
    city: 'Mumbai',
    venueName: 'Aer Lounge',
    venueAddress: 'Four Seasons Hotel, Worli, Mumbai',
    location: { type: 'Point', coordinates: [72.8185, 19.0089] },
    dateTime: new Date('2026-02-22T19:00:00'),
    duration: 180,
    maxParticipants: 6,
    participants: [{ userId: arjun._id, joinedAt: new Date(), status: 'confirmed' }],
    genderCount: { male: 1, female: 0, other: 0 },
    mood: 'party',
    status: 'active',
  });

  const all = [a1, a2, a3, a4, a5, a6, a7, a8, a9, a10];

  console.log(`\n${all.length} Activities created:`);
  all.forEach((a: any) => {
    console.log(`  ${a.emoji} ${a.title} (${a.city}) [${a.categories.join(', ')}]`);
  });

  console.log('\nSeed complete! Activities span: Mumbai, Goa, Bangalore, Delhi');
  console.log('Categories covered: Food, Adventure, Party, Coworking, Culture, Wellness');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
