const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const Person = require('../models/Person');
const Event = require('../models/Event');
const SongRequest = require('../models/SongRequest');
const connectDB = require('../config/database');

// Load env vars
dotenv.config();

// Sample data
const seedData = async () => {
  try {
    // Connect to database
    await connectDB();

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Person.deleteMany({});
    await Event.deleteMany({});
    await SongRequest.deleteMany({});

    // Create sample persons
    console.log('👥 Creating sample persons...');
    const persons = [
      {
        firstName: 'John',
        lastName: 'Admin',
        email: 'admin@dropmybeats.com',
        password: await bcrypt.hash('Admin123!', 12),
        role: 'Admin',
        phoneNumber: '+1234567890',
        organizationName: 'DropMyBeats Inc',
        favoriteGenres: ['Rock', 'Pop', 'Electronic']
      },
      {
        firstName: 'Sarah',
        lastName: 'Manager',
        email: 'sarah.manager@dropmybeats.com',
        password: await bcrypt.hash('Manager123!', 12),
        role: 'Manager',
        phoneNumber: '+1234567891',
        organizationName: 'Event Productions',
        favoriteGenres: ['Hip Hop', 'R&B', 'Jazz']
      },
      {
        firstName: 'Mike',
        lastName: 'DJ',
        email: 'mike.dj@dropmybeats.com',
        password: await bcrypt.hash('Manager123!', 12),
        role: 'Manager',
        phoneNumber: '+1234567892',
        organizationName: 'DJ Mike Productions',
        favoriteGenres: ['Electronic', 'House', 'Techno']
      },
      {
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@example.com',
        password: await bcrypt.hash('User123!', 12),
        role: 'Participant',
        phoneNumber: '+1234567893',
        favoriteGenres: ['Pop', 'Rock']
      },
      {
        firstName: 'Bob',
        lastName: 'Smith',
        email: 'bob@example.com',
        password: await bcrypt.hash('User123!', 12),
        role: 'Participant',
        phoneNumber: '+1234567894',
        favoriteGenres: ['Hip Hop', 'Rap']
      },
      {
        firstName: 'Emma',
        lastName: 'Wilson',
        email: 'emma@example.com',
        password: await bcrypt.hash('User123!', 12),
        role: 'Participant',
        phoneNumber: '+1234567895',
        favoriteGenres: ['Electronic', 'Pop']
      }
    ];

    const createdPersons = await Person.insertMany(persons);
    console.log(`✅ Created ${createdPersons.length} persons`);

    // Get managers for events
    const managers = createdPersons.filter(p => p.role === 'Manager');
    const participants = createdPersons.filter(p => p.role === 'Participant');

    // Create sample events
    console.log('🎉 Creating sample events...');
    const events = [
      {
        name: 'Summer Music Festival 2024',
        description: 'Join us for the biggest summer music festival with live DJs and amazing vibes!',
        eventType: 'Festival',
        startDate: new Date('2024-07-15T18:00:00Z'),
        endDate: new Date('2024-07-15T23:00:00Z'),
        venue: {
          name: 'Central Park Amphitheater',
          address: '1234 Central Park West',
          city: 'New York',
          state: 'NY',
          zipCode: '10024'
        },
        manager: managers[0]._id,
        createdBy: managers[0]._id,
        maxParticipants: 500,
        isPublic: true,
        allowSongRequests: true,
        timeBombEnabled: true,
        timeBombDuration: 120, // Fixed: was 300, max is 180
        participants: [
          { user: participants[0]._id },
          { user: participants[1]._id }
        ]
      },
      {
        name: 'Corporate Party - Tech Corp',
        description: 'Private corporate event with DJ entertainment',
        eventType: 'Corporate',
        startDate: new Date('2024-06-20T19:00:00Z'),
        endDate: new Date('2024-06-20T22:00:00Z'),
        venue: {
          name: 'Tech Corp Conference Center',
          address: '5678 Business Blvd',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105'
        },
        manager: managers[1]._id,
        createdBy: managers[1]._id,
        maxParticipants: 100,
        isPublic: false,
        allowSongRequests: true,
        timeBombEnabled: false,
        participants: [
          { user: participants[2]._id }
        ]
      },
      {
        name: 'Weekend House Party',
        description: 'Intimate house party with electronic music',
        eventType: 'Private',
        startDate: new Date('2024-06-25T20:00:00Z'),
        endDate: new Date('2024-06-26T02:00:00Z'),
        venue: {
          name: 'Private Residence',
          address: '9876 Elm Street',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210'
        },
        manager: managers[0]._id,
        createdBy: managers[0]._id,
        maxParticipants: 50,
        isPublic: true,
        allowSongRequests: true,
        timeBombEnabled: true,
        timeBombDuration: 180, // Fixed: was 600, max is 180
        participants: participants.map(p => ({ user: p._id }))
      },
      {
        name: 'Wedding Reception - Smith & Johnson',
        description: 'Beautiful wedding reception with live DJ',
        eventType: 'Wedding',
        startDate: new Date('2024-08-10T17:00:00Z'),
        endDate: new Date('2024-08-10T23:00:00Z'),
        venue: {
          name: 'Grand Ballroom Hotel',
          address: '1111 Wedding Way',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601'
        },
        manager: managers[1]._id,
        createdBy: managers[1]._id,
        maxParticipants: 200,
        isPublic: false,
        allowSongRequests: true,
        timeBombEnabled: false,
        participants: []
      }
    ];

    const createdEvents = await Event.insertMany(events);
    console.log(`✅ Created ${createdEvents.length} events`);

    // Create sample song requests
    console.log('🎵 Creating sample song requests...');
    const songRequests = [
      {
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        album: 'After Hours',
        genre: 'Pop',
        duration: 200,
        spotifyId: '0VjIjW4GlULA4LGoDOLVKN',
        requestedBy: participants[0]._id,
        event: createdEvents[0]._id,
        status: 'Approved', // Fixed: was 'approved'
        priority: 8,
        likes: [
          { user: participants[1]._id },
          { user: participants[2]._id }
        ] // Fixed: was array of IDs
      },
      {
        title: 'Levitating',
        artist: 'Dua Lipa',
        album: 'Future Nostalgia',
        genre: 'Pop',
        duration: 203,
        spotifyId: '463CkQjx2Zk1yXoBuierM9',
        requestedBy: participants[1]._id,
        event: createdEvents[0]._id,
        status: 'Pending', // Fixed: was 'pending'
        priority: 7,
        likes: [
          { user: participants[0]._id }
        ] // Fixed: was array of IDs
      },
      {
        title: 'One More Time',
        artist: 'Daft Punk',
        album: 'Discovery',
        genre: 'Electronic',
        duration: 320,
        requestedBy: participants[2]._id,
        event: createdEvents[2]._id,
        status: 'Approved', // Fixed: was 'approved'
        priority: 9,
        likes: participants.map(p => ({ user: p._id })) // Fixed: was array of IDs
      },
      {
        title: 'Good 4 U',
        artist: 'Olivia Rodrigo',
        album: 'SOUR',
        genre: 'Pop Rock',
        duration: 178,
        requestedBy: participants[0]._id,
        event: createdEvents[1]._id,
        status: 'Played', // Fixed: was 'played'
        priority: 6,
        playedAt: new Date(Date.now() - 3600000) // 1 hour ago
      },
      {
        title: 'Industry Baby',
        artist: 'Lil Nas X ft. Jack Harlow',
        album: 'MONTERO',
        genre: 'Hip Hop',
        duration: 212,
        youtubeId: 'UTHLKHL_whs',
        requestedBy: participants[1]._id,
        event: createdEvents[0]._id,
        status: 'Rejected', // Fixed: was 'rejected'
        rejectionReason: 'Explicit content not suitable for this event'
      },
      {
        title: 'Stay',
        artist: 'The Kid LAROI & Justin Bieber',
        genre: 'Pop',
        duration: 141,
        requestedBy: participants[2]._id,
        event: createdEvents[2]._id,
        status: 'Pending', // Fixed: was 'pending'
        priority: 5,
        isTimeBomb: true,
        timeBombExpiresAt: new Date(Date.now() + 300000) // 5 minutes from now
      }
    ];

    const createdSongRequests = await SongRequest.insertMany(songRequests);
    console.log(`✅ Created ${createdSongRequests.length} song requests`);

    console.log('\n🎉 Seed data created successfully!');
    console.log('\n📋 Summary:');
    console.log(`   👥 Persons: ${createdPersons.length}`);
    console.log(`   🎉 Events: ${createdEvents.length}`);
    console.log(`   🎵 Song Requests: ${createdSongRequests.length}`);
    
    console.log('\n🔐 Test Accounts:');
    console.log('   Admin: admin@dropmybeats.com / Admin123!');
    console.log('   Manager: sarah.manager@dropmybeats.com / Manager123!');
    console.log('   DJ: mike.dj@dropmybeats.com / Manager123!');
    console.log('   User: alice@example.com / User123!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

// Run seeder
if (require.main === module) {
  seedData();
}

module.exports = seedData;