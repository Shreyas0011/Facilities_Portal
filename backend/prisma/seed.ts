import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Super Admin
  const hashedPassword = await bcrypt.hash('Transcend@2026', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@campus.edu' },
    update: { name: 'Dr. Robert Chen' },
    create: {
      name: 'Dr. Robert Chen',
      email: 'admin@campus.edu',
      password: hashedPassword,
      role: 'superadmin',
      department: 'Administration',
    },
  });

  const superAdmin1 = await prisma.user.upsert({
    where: { email: 'prasannak@transcendgroup.org' },
    update: { name: 'Prasanna Kumar K' },
    create: {
      name: 'Prasanna Kumar K',
      email: 'prasannak@transcendgroup.org',
      password: hashedPassword,
      role: 'superadmin',
      department: 'Administration',
    },
  });

  const superAdmin2 = await prisma.user.upsert({
    where: { email: 'pankajmatta@transcendgroup.org' },
    update: { name: 'Pankaj M' },
    create: {
      name: 'Pankaj M',
      email: 'pankajmatta@transcendgroup.org',
      password: hashedPassword,
      role: 'superadmin',
      department: 'Administration',
    },
  });

  const superAdmin3 = await prisma.user.upsert({
    where: { email: 'siddharthkt@transcendgroup.org' },
    update: { name: 'Siddharth K T' },
    create: {
      name: 'Siddharth K T',
      email: 'siddharthkt@transcendgroup.org',
      password: hashedPassword,
      role: 'superadmin',
      department: 'Administration',
    },
  });

  const superAdmin4 = await prisma.user.upsert({
    where: { email: 'shwethas@transcendgroup.org' },
    update: { name: 'Shwetha S' },
    create: {
      name: 'Shwetha S',
      email: 'shwethas@transcendgroup.org',
      password: hashedPassword,
      role: 'superadmin',
      department: 'Administration',
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@campus.edu' },
    update: {},
    create: {
      name: 'Demo Viewer',
      email: 'viewer@campus.edu',
      password: hashedPassword,
      role: 'viewer',
      department: 'Computer Science',
    },
  });

  const viewersData = [
    { name: 'Ravi Kiran T N', email: 'ravikiran.tn@transcendgroup.org' },
    { name: 'Parimala S', email: 'parimalas@transcendgroup.org' },
    { name: 'Shruthi T R', email: 'shruthi.tr@transcendgroup.org' },
    { name: 'Divya J', email: 'divya.j@transcendgroup.org' },
    { name: 'R. Kokila', email: 'kokila.r@transcendgroup.org' },
    { name: 'Pooja Dikshith S', email: 'poojadeekshith.s@transcendgroup.org' },
    { name: 'Vani Sridhar', email: 'vani.sridhar@transcendgroup.org' },
    { name: 'Rashmi Raghuram', email: 'rashmi.r@transcendgroup.org' },
    { name: 'SHRUTHI BL', email: 'shruthibl@transcendgroup.org' },
    { name: 'Swati S Pandit', email: 'swatipandit@transcendgroup.org' },
    { name: 'Meghana Bangalore', email: 'meghana@transcendgroup.org' },
    { name: 'Narasimhaiah K', email: 'narasimhaiahk@transcendgroup.org' },
    { name: 'Vani S Rao', email: 'vani.rao@transcendgroup.org' },
    { name: 'Shravana Kumar', email: 'shravana.k@transcendgroup.org' },
    { name: 'Dr. K R Shashikala', email: 'shashikalarao@transcendgroup.org' },
    { name: 'Agnel Trivikram G', email: 'agneltrivikramg@transcendgroup.org' },
    { name: 'Jessy Mathew', email: 'jessymathew@transcendgroup.org' },
    { name: 'Roopa Kambam', email: 'roopakambam@transcendgroup.org' },
    { name: 'Prashanth Jadav J', email: 'prashanth.j@transcendgroup.org' },
    { name: 'Reshma Belagaje', email: 'reshma.b@transcendgroup.org' },
    { name: 'G Shushma', email: 'shushma.g@transcendgroup.org' },
    { name: 'Pallavi A', email: 'pallavi.a@transcendgroup.org' }
  ];

  for (const v of viewersData) {
    await prisma.user.upsert({
      where: { email: v.email },
      update: { name: v.name },
      create: {
        name: v.name,
        email: v.email,
        password: hashedPassword,
        role: 'viewer',
        department: 'General',
      },
    });
  }

  const adminsData = [
    { name: 'Prasad K', email: 'prasad@transcendgroup.org' },
    { name: 'Niranjan D G', email: 'niranjan.dg@transcendgroup.org' },
    { name: 'Padmaja N', email: 'padmaja@transcendgroup.org' }
  ];

  for (const a of adminsData) {
    await prisma.user.upsert({
      where: { email: a.email },
      update: { name: a.name, role: 'admin' },
      create: {
        name: a.name,
        email: a.email,
        password: hashedPassword,
        role: 'admin',
        department: 'Administration',
      },
    });
  }

  const faculty = await prisma.user.upsert({
    where: { email: 'faculty@campus.edu' },
    update: {},
    create: {
      name: 'Prof. Jenkins',
      email: 'faculty@campus.edu',
      password: hashedPassword,
      role: 'faculty',
      department: 'Physics',
    },
  });

  const facultiesData = [
    { name: 'Brinda R', email: 'brindar@transcendgroup.org' },
    { name: 'Annapoorna M', email: 'annapoornam@transcendgroup.org' },
    { name: 'Aparna Barengai', email: 'aparna.b@transcendgroup.org' },
    { name: 'C. Sree Lakshmi M', email: 'sreelakshmimenon@transcendgroup.org' },
    { name: 'Sneha Alok', email: 'snehaalok@transcendgroup.org' },
    { name: 'Aarthy Vasudevan', email: 'aarthy.v@transcendgroup.org' },
    { name: 'Akshaykumar Kulkarni', email: 'akshaykumarkulkarni@transcendgroup.org' },
    { name: 'Prathima S', email: 'prathimas@transcendgroup.org' },
    { name: 'Anusha Balaji', email: 'anusha.b@transcendgroup.org' },
    { name: 'SWATHI K IYER', email: 'swathi.iyer@transcendgroup.org' }
  ];

  for (const f of facultiesData) {
    await prisma.user.upsert({
      where: { email: f.email },
      update: { name: f.name },
      create: {
        name: f.name,
        email: f.email,
        password: hashedPassword,
        role: 'faculty',
        department: 'Academic',
      },
    });
  }

  const manager = await prisma.user.upsert({
    where: { email: 'manager@campus.edu' },
    update: { name: 'Mr. John Doe' },
    create: {
      name: 'Mr. John Doe',
      email: 'manager@campus.edu',
      password: hashedPassword,
      role: 'admin',
      department: 'Estate Office',
    },
  });

  console.log(`Created admin user: ${admin.email}`);
  console.log(`Created super admin user: ${superAdmin1.email}`);
  console.log(`Created super admin user: ${superAdmin2.email}`);
  console.log(`Created super admin user: ${superAdmin3.email}`);
  console.log(`Created super admin user: ${superAdmin4.email}`);
  console.log(`Created viewer user: ${viewer.email}`);
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
