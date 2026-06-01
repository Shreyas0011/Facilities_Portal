import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Super Admin
  const hashedPassword = await bcrypt.hash('password123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@campus.edu' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@campus.edu',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      department: 'Administration',
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@campus.edu' },
    update: {},
    create: {
      name: 'Demo Student',
      email: 'student@campus.edu',
      password: hashedPassword,
      role: 'STUDENT',
      department: 'Computer Science',
    },
  });

  const faculty = await prisma.user.upsert({
    where: { email: 'faculty@campus.edu' },
    update: {},
    create: {
      name: 'Prof. Jenkins',
      email: 'faculty@campus.edu',
      password: hashedPassword,
      role: 'FACULTY',
      department: 'Physics',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@campus.edu' },
    update: {},
    create: {
      name: 'Facility Manager',
      email: 'manager@campus.edu',
      password: hashedPassword,
      role: 'ADMIN',
      department: 'Estate Office',
    },
  });

  console.log(`Created admin user: ${admin.email}`);
  console.log(`Created student user: ${student.email}`);
  console.log(`Created faculty user: ${faculty.email}`);
  console.log(`Created manager user: ${manager.email}`);

  // 2. Create Facilities
  const facilitiesData = [
    {
      name: 'Main Auditorium',
      description: 'A large, state-of-the-art auditorium suitable for major events, conferences, and performances. Features a high-quality sound system and dual 4K projectors.',
      type: 'AUDITORIUM' as const,
      capacity: 500,
      location: 'Main Building, Floor 1',
      building: 'Main Building',
      availabilityStart: '08:00',
      availabilityEnd: '16:00',
      requiresApproval: true,
      amenities: ['Projector', 'PA System', 'Stage Lighting', 'AC', 'Wheelchair Access', 'Wifi'],
      rules: ['No food or drinks inside', 'Booking required 7 days in advance for major events'],
      images: [
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
      ],
    },
    {
      name: 'Innovation Lab',
      description: 'Modern collaborative workspace for project teams and startup incubation. Equipped with high-end workstations and 3D printers.',
      type: 'LAB' as const,
      capacity: 30,
      location: 'Tech Hub, Floor 2',
      building: 'Tech Hub',
      availabilityStart: '08:00',
      availabilityEnd: '16:00',
      requiresApproval: false,
      amenities: ['3D Printers', 'VR Headsets', 'High-end PCs', 'Whiteboards', 'Coffee Machine'],
      rules: ['Clean up your workspace', 'Do not unplug shared equipment'],
      images: [
        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1531482615713-2afd69097998?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
      ],
    },
    {
      name: 'Olympic Sports Ground',
      description: 'Full-size multipurpose sports ground suitable for football, athletics, and large outdoor gatherings.',
      type: 'SPORTS_FACILITY' as const,
      capacity: 1000,
      location: 'North Campus',
      building: 'Sports Complex',
      availabilityStart: '08:00',
      availabilityEnd: '16:00',
      requiresApproval: true,
      amenities: ['Floodlights', 'Bleachers', 'Changing Rooms', 'Equipment Room'],
      rules: ['Proper sports attire required', 'No studs on the running track'],
      images: [
        'https://images.unsplash.com/photo-1589487391730-58f20eb2c308?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      ],
    },
    {
      name: 'Executive Conference Room A',
      description: 'Premium meeting room for faculty meetings, guest lectures, and corporate presentations.',
      type: 'CONFERENCE_ROOM' as const,
      capacity: 20,
      location: 'Admin Block, Floor 3',
      building: 'Admin Block',
      availabilityStart: '08:00',
      availabilityEnd: '16:00',
      requiresApproval: true,
      amenities: ['Smart Board', 'Video Conferencing', 'Mini Fridge', 'Ergonomic Chairs'],
      rules: ['Faculty priority booking', 'Leave the room tidy'],
      images: [
        'https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      ],
    },
    {
      name: 'Lecture Hall 101',
      description: 'Standard tiered lecture hall for regular classes and seminars.',
      type: 'CLASSROOM' as const,
      capacity: 120,
      location: 'Science Block, Floor 1',
      building: 'Science Block',
      availabilityStart: '08:00',
      availabilityEnd: '16:00',
      requiresApproval: false,
      amenities: ['Projector', 'Whiteboard', 'Microphone', 'AC'],
      rules: ['Classes have priority during 8am-4pm'],
      images: [
        'https://images.unsplash.com/photo-1577412647305-991150c7d163?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      ],
    },
  ];

  for (const facility of facilitiesData) {
    const data = {
      ...facility,
      amenities: JSON.stringify(facility.amenities),
      images: JSON.stringify(facility.images),
      rules: JSON.stringify(facility.rules),
    };
    const created = await prisma.facility.create({
      data: data as any,
    });
    console.log(`Created facility: ${created.name}`);
  }

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
