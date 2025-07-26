import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Announcement from '../models/Announcement.js';
import Complaint from '../models/Complaint.js';

// Load environment variables
dotenv.config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campus_link');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Announcement.deleteMany({});
    await Complaint.deleteMany({});
    console.log('Cleared existing data');

    // Create test users
    const users = await User.create([
      {
        email: 'student@sece.ac.in',
        password: 'student@123',
        userType: 'student',
        prefix: 'Mr',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+91 9876543210',
        department: 'Computer Science Engineering',
        rollNo: '20CS001',
        year: '3rd Year',
        section: 'A',
        accommodation: 'Hostel',
        block: 'A Block',
        roomNo: 'A-201',
        isEmailVerified: true,
        isActive: true
      },
      {
        email: 'staff@sece.ac.in',
        password: 'staff@123',
        userType: 'staff',
        prefix: 'Dr',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+91 9876543211',
        department: 'Computer Science Engineering',
        employeeId: 'EMP001',
        designation: 'Associate Professor',
        isEmailVerified: true,
        isActive: true
      },
      {
        email: 'hod@sece.ac.in',
        password: 'hod@123',
        userType: 'staff',
        prefix: 'Dr',
        firstName: 'Robert',
        lastName: 'Johnson',
        phone: '+91 9876543212',
        department: 'Computer Science Engineering',
        employeeId: 'EMP002',
        designation: 'HOD',
        isEmailVerified: true,
        isActive: true
      },
      {
        email: 'admin@sece.ac.in',
        password: 'admin@123',
        userType: 'staff',
        prefix: 'Dr',
        firstName: 'Admin',
        lastName: 'User',
        phone: '+91 9876543213',
        department: 'Administration',
        employeeId: 'EMP003',
        designation: 'Admin',
        isEmailVerified: true,
        isActive: true
      }
    ]);

    console.log('Created test users');

    // Create test announcements
    const announcements = await Announcement.create([
      {
        title: 'Welcome to New Academic Year 2024-25',
        content: 'Dear students, welcome to the new academic year! We hope you had a great summer break. Please ensure all your registrations are completed by the end of this week. For any queries, contact your respective department offices.',
        category: 'academic',
        priority: 'high',
        author: users[1]._id, // staff user
        department: 'Computer Science Engineering',
        targetAudience: ['all', 'students'],
        isPublished: true,
        isPinned: true,
        publishDate: new Date(),
        status: 'published'
      },
      {
        title: 'Hostel Maintenance Notice',
        content: 'Scheduled maintenance will be carried out in Block A and B from 10 AM to 2 PM on Saturday. Water supply will be temporarily affected. Please store water if needed.',
        category: 'hostel',
        priority: 'medium',
        author: users[2]._id, // HOD user
        department: 'Computer Science Engineering',
        targetAudience: ['hostel', 'students'],
        isPublished: true,
        publishDate: new Date(),
        status: 'published'
      },
      {
        title: 'Technical Symposium Registration Open',
        content: 'Registration for the annual technical symposium is now open! Submit your project abstracts by next Friday. Cash prizes worth ₹50,000 to be won. Contact the technical team for more details.',
        category: 'events',
        priority: 'medium',
        author: users[1]._id, // staff user
        department: 'Computer Science Engineering',
        targetAudience: ['students', '3rd-year', '4th-year'],
        isPublished: true,
        publishDate: new Date(),
        status: 'published'
      },
      {
        title: 'Library Hours Extended',
        content: 'Due to exam season, library hours have been extended. Library will now be open from 7 AM to 11 PM on weekdays and 8 AM to 10 PM on weekends.',
        category: 'academic',
        priority: 'low',
        author: users[3]._id, // admin user
        department: 'Administration',
        targetAudience: ['all', 'students'],
        isPublished: true,
        publishDate: new Date(),
        status: 'published'
      },
      {
        title: 'Emergency Contact Numbers',
        content: 'Important: Save these emergency contact numbers - Security: 1234567890, Medical: 0987654321, Hostel Warden: 1122334455. Available 24/7 for emergencies.',
        category: 'urgent',
        priority: 'critical',
        author: users[3]._id, // admin user
        department: 'Administration',
        targetAudience: ['all'],
        isPublished: true,
        isPinned: true,
        publishDate: new Date(),
        status: 'published'
      }
    ]);

    console.log('Created test announcements');

    // Create test complaints
    const complaints = await Complaint.create([
      {
        complainant: users[0]._id, // student user
        category: 'hostel',
        subCategory: 'Electrical',
        priority: 'high',
        subject: 'Power Outage in Room A-201',
        description: 'There has been no power in my room since yesterday evening. I have tried the circuit breaker but the issue persists. This is affecting my studies.',
        location: 'Block A, Room A-201',
        status: 'pending',
        tags: ['electrical', 'urgent']
      },
      {
        complainant: users[0]._id, // student user
        category: 'infrastructure',
        subCategory: 'WiFi',
        priority: 'medium',
        subject: 'Slow WiFi in Computer Lab',
        description: 'The WiFi connection in the computer lab is extremely slow during peak hours. This affects our practical sessions and project work.',
        location: 'Computer Lab, Ground Floor',
        status: 'in-progress',
        assignedTo: users[1]._id, // staff user
        assignedAt: new Date(),
        tags: ['wifi', 'lab']
      },
      {
        complainant: users[0]._id, // student user
        category: 'food',
        subCategory: 'Quality',
        priority: 'low',
        subject: 'Food Quality in Mess',
        description: 'The food quality in the mess has deteriorated over the past week. The vegetables seem stale and the taste is not up to the usual standard.',
        location: 'Student Mess',
        status: 'resolved',
        assignedTo: users[2]._id, // HOD user
        assignedAt: new Date(Date.now() - 86400000), // 1 day ago
        actualResolutionTime: new Date(),
        resolution: {
          description: 'Mess contractor has been informed and quality checks have been implemented',
          actionTaken: 'Regular quality monitoring system put in place',
          completedBy: users[2]._id,
          completedAt: new Date()
        },
        rating: {
          score: 4,
          feedback: 'Issue was resolved quickly and satisfactorily',
          ratedAt: new Date()
        },
        tags: ['food', 'mess']
      }
    ]);

    console.log('Created test complaints');

    // Add some responses to complaints
    await Complaint.findByIdAndUpdate(complaints[1]._id, {
      $push: {
        responses: {
          responder: users[1]._id,
          message: 'We are aware of the WiFi issue and are working on upgrading the network infrastructure. This should be resolved by next week.',
          isInternal: false,
          createdAt: new Date()
        }
      }
    });

    await Complaint.findByIdAndUpdate(complaints[2]._id, {
      $push: {
        responses: {
          responder: users[2]._id,
          message: 'Thank you for bringing this to our attention. We have spoken to the mess contractor and implemented stricter quality control measures.',
          isInternal: false,
          createdAt: new Date(Date.now() - 86400000)
        }
      }
    });

    console.log('Added test responses to complaints');

    console.log('✅ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`👥 Users: ${users.length}`);
    console.log(`📢 Announcements: ${announcements.length}`);
    console.log(`📝 Complaints: ${complaints.length}`);
    console.log('\n🔑 Test Credentials:');
    console.log('Student: student@sece.ac.in / student@123');
    console.log('Staff: staff@sece.ac.in / staff@123');
    console.log('HOD: hod@sece.ac.in / hod@123');
    console.log('Admin: admin@sece.ac.in / admin@123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

// Run the seed function
seedData(); 