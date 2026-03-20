import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  await prisma.alert.deleteMany();
  await prisma.metric.deleteMany();
  await prisma.device.deleteMany();

  const devices = [
    // Traffic Signals (8)
    { type: 'signal', latitude: 40.7128, longitude: -74.006, location: 'Times Square, Manhattan' },
    { type: 'signal', latitude: 40.7589, longitude: -73.9851, location: 'Central Park South' },
    { type: 'signal', latitude: 40.7484, longitude: -73.9857, location: 'Empire State Building' },
    { type: 'signal', latitude: 40.7061, longitude: -74.0087, location: 'Wall Street, Financial District' },
    { type: 'signal', latitude: 40.7614, longitude: -73.9776, location: 'Grand Central Terminal' },
    { type: 'signal', latitude: 40.6892, longitude: -74.0445, location: 'Brooklyn Bridge Entrance' },
    { type: 'signal', latitude: 40.6501, longitude: -73.9496, location: 'Flatbush Avenue, Brooklyn' },
    { type: 'signal', latitude: 40.7282, longitude: -73.7949, location: 'Jamaica Avenue, Queens' },
    
    // CCTV Cameras (7)
    { type: 'cctv', latitude: 40.7527, longitude: -73.9772, location: 'Penn Station, Midtown' },
    { type: 'cctv', latitude: 40.7580, longitude: -73.9855, location: 'Columbus Circle' },
    { type: 'cctv', latitude: 40.7489, longitude: -73.9680, location: 'Madison Square Garden' },
    { type: 'cctv', latitude: 40.7061, longitude: -74.0090, location: 'Battery Park' },
    { type: 'cctv', latitude: 40.7831, longitude: -73.9712, location: 'Lincoln Center' },
    { type: 'cctv', latitude: 40.6782, longitude: -73.9442, location: 'Prospect Park, Brooklyn' },
    { type: 'cctv', latitude: 40.8448, longitude: -73.8648, location: 'Bronx, Fordham Road' },
    
    // Microcontrollers (5)
    { type: 'microcontroller', latitude: 40.7023, longitude: -74.0154, location: 'Hudson Yards' },
    { type: 'microcontroller', latitude: 40.7209, longitude: -73.9977, location: 'SoHo, Broadway' },
    { type: 'microcontroller', latitude: 40.7268, longitude: -73.9832, location: 'East Village' },
    { type: 'microcontroller', latitude: 40.7736, longitude: -73.9566, location: 'Upper East Side' },
    { type: 'microcontroller', latitude: 40.7903, longitude: -73.9580, location: 'Upper West Side' },
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

    for (let i = 0; i < 20; i++) {
      const timestamp = new Date(Date.now() - i * 60000);
      await prisma.metric.create({
        data: {
          deviceId: device.id,
          temperature: 35 + Math.random() * 20,
          voltage: 220 + Math.random() * 20,
          errorRate: Math.random() * 5,
          uptime: 95 + Math.random() * 5,
          timestamp
        }
      });
    }

    console.log(`Created: ${device.type} @ ${device.location}`);
  }

  console.log(`\n✓ Seed completed! Created ${devices.length} devices`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
