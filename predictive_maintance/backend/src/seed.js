import { PrismaClient } from '@prisma/client';
import { io } from '../index.js';

const prisma = new PrismaClient();

async function seed() {
  console.log('Starting seed...');

  // Clear existing data
  await prisma.alerts.deleteMany();
  await prisma.metrics.deleteMany();
  await prisma.device.deleteMany();

  const devices = [
    { type: 'signal', latitude: 40.7128, longitude: -74.006, location: 'Times Square, NYC' },
    { type: 'signal', latitude: 40.7589, longitude: -73.9851, location: 'Central Park, NYC' },
    { type: 'signal', latitude: 40.7484, longitude: -73.9857, location: 'Empire State, NYC' },
    { type: 'cctv', latitude: 40.7282, longitude: -73.7949, location: 'Queens, NYC' },
    { type: 'cctv', latitude: 40.6892, longitude: -74.0445, location: 'Brooklyn, NYC' },
    { type: 'microcontroller', latitude: 40.7061, longitude: -74.0087, location: 'Wall Street, NYC' },
    { type: 'microcontroller', latitude: 40.7614, longitude: -73.9776, location: 'Midtown, NYC' },
    { type: 'signal', latitude: 40.6501, longitude: -73.9496, location: 'Flatbush, Brooklyn' },
  ];

  for (const deviceData of devices) {
    const device = await prisma.device.create({
      data: {
        type: deviceData.type,
        latitude: deviceData.latitude,
        longitude: deviceData.longitude,
        location: deviceData.location,
        status: 'healthy'
      }
    });

    // Create initial metrics
    const metrics = [];
    for (let i = 0; i < 20; i++) {
      const timestamp = new Date(Date.now() - i * 60000);
      metrics.push({
        device_id: device.id,
        temperature: 35 + Math.random() * 20,
        voltage: 220 + Math.random() * 20,
        error_rate: Math.random() * 5,
        uptime: 100 - Math.random() * 10,
        timestamp
      });
    }

    await prisma.metrics.createMany({ data: metrics });
    console.log(`Created device: ${device.id} (${device.type})`);
  }

  console.log('Seed completed!');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
