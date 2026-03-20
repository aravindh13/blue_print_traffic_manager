require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Ambulance = require('./models/Ambulance');
const Hospital = require('./models/Hospital');
const TrafficSignal = require('./models/TrafficSignal');
const Incident = require('./models/Incident');

// Bangalore coordinates centered around MG Road / Brigade Road area
const AMBULANCES = [
  { driverName: 'Arjun Sharma', driverEmail: 'arjun@gc.com', vehicleNumber: 'KA-01-A-1001', lat: 12.9726, lng: 77.5861 },
  { driverName: 'Priya Nair', driverEmail: 'priya@gc.com', vehicleNumber: 'KA-01-A-1002', lat: 12.9750, lng: 77.5950 },
  { driverName: 'Ravi Kumar', driverEmail: 'ravi@gc.com', vehicleNumber: 'KA-01-A-1003', lat: 12.9680, lng: 77.5880 },
  { driverName: 'Deepa Menon', driverEmail: 'deepa@gc.com', vehicleNumber: 'KA-01-A-1004', lat: 12.9710, lng: 77.5800 },
  { driverName: 'Suresh Pillai', driverEmail: 'suresh@gc.com', vehicleNumber: 'KA-01-A-1005', lat: 12.9640, lng: 77.5920 },
  { driverName: 'Vikram Singh', driverEmail: 'vikram@gc.com', vehicleNumber: 'KA-01-A-1006', lat: 12.9600, lng: 77.5780 },
  { driverName: 'Anita Reddy', driverEmail: 'anita@gc.com', vehicleNumber: 'KA-01-A-1007', lat: 12.9550, lng: 77.5850 },
  { driverName: 'Mohan Das', driverEmail: 'mohan@gc.com', vehicleNumber: 'KA-01-A-1008', lat: 12.9780, lng: 77.5700 },
  { driverName: 'Kavitha Rao', driverEmail: 'kavitha@gc.com', vehicleNumber: 'KA-01-A-1009', lat: 12.9820, lng: 77.5750 },
  { driverName: 'Rajesh Nair', driverEmail: 'rajesh@gc.com', vehicleNumber: 'KA-01-A-1010', lat: 12.9500, lng: 77.5950 },
  { driverName: 'Lakshmi Devi', driverEmail: 'lakshmi@gc.com', vehicleNumber: 'KA-01-A-1011', lat: 12.9450, lng: 77.5800 },
  { driverName: 'Sanjay Kumar', driverEmail: 'sanjay@gc.com', vehicleNumber: 'KA-01-A-1012', lat: 12.9850, lng: 77.5650 },
  { driverName: 'Meera Shah', driverEmail: 'meera@gc.com', vehicleNumber: 'KA-01-A-1013', lat: 12.9900, lng: 77.5750 },
  { driverName: 'Gopal Krishna', driverEmail: 'gopal@gc.com', vehicleNumber: 'KA-01-A-1014', lat: 12.9350, lng: 77.6000 },
  { driverName: 'Fatima Begum', driverEmail: 'fatima@gc.com', vehicleNumber: 'KA-01-A-1015', lat: 12.9400, lng: 77.5900 },
  { driverName: 'Ravi Rajan', driverEmail: 'ravir@gc.com', vehicleNumber: 'KA-01-A-1016', lat: 12.9300, lng: 77.5750 },
  { driverName: 'Sunita Devi', driverEmail: 'sunita@gc.com', vehicleNumber: 'KA-01-A-1017', lat: 12.9250, lng: 77.5650 },
  { driverName: 'Krishna Murthy', driverEmail: 'krishna@gc.com', vehicleNumber: 'KA-01-A-1018', lat: 12.9200, lng: 77.5800 },
  { driverName: 'Parvathi Bai', driverEmail: 'parvathi@gc.com', vehicleNumber: 'KA-01-A-1019', lat: 12.9150, lng: 77.5700 },
  { driverName: 'Manjunath Gowda', driverEmail: 'manjunath@gc.com', vehicleNumber: 'KA-01-A-1020', lat: 12.9100, lng: 77.5750 },
  { driverName: 'Ramesh Patil', driverEmail: 'ramesh@gc.com', vehicleNumber: 'KA-01-A-1021', lat: 12.9050, lng: 77.5800 },
  { driverName: 'Geeta Devi', driverEmail: 'geeta@gc.com', vehicleNumber: 'KA-01-A-1022', lat: 12.9000, lng: 77.5750 },
  { driverName: 'Prakash Rao', driverEmail: 'prakash@gc.com', vehicleNumber: 'KA-01-A-1023', lat: 12.8950, lng: 77.5700 },
  { driverName: 'Anjali Gupta', driverEmail: 'anjali@gc.com', vehicleNumber: 'KA-01-A-1024', lat: 12.8900, lng: 77.5650 },
  { driverName: 'Vijay Kumar', driverEmail: 'vijay@gc.com', vehicleNumber: 'KA-01-A-1025', lat: 12.8850, lng: 77.5600 },
  { driverName: 'Sujata Reddy', driverEmail: 'sujata@gc.com', vehicleNumber: 'KA-01-A-1026', lat: 12.8800, lng: 77.5550 },
  { driverName: 'Raghavendra', driverEmail: 'raghav@gc.com', vehicleNumber: 'KA-01-A-1027', lat: 12.8750, lng: 77.5500 },
  { driverName: 'Nagamma', driverEmail: 'nagamma@gc.com', vehicleNumber: 'KA-01-A-1028', lat: 12.8700, lng: 77.5450 },
  { driverName: 'Shiva Prasad', driverEmail: 'shiva@gc.com', vehicleNumber: 'KA-01-A-1029', lat: 12.8650, lng: 77.5400 },
  { driverName: 'Lakshman Rao', driverEmail: 'lakshman@gc.com', vehicleNumber: 'KA-01-A-1030', lat: 12.8600, lng: 77.5350 }
];

const HOSPITALS = [
  { name: 'Manipal Hospital', lat: 12.9490, lng: 77.5999, capacity: 500, specialties: ['Trauma', 'Cardiology'] },
  { name: 'St. John Medical Center', lat: 12.9353, lng: 77.6245, capacity: 350, specialties: ['General Surgery', 'Neurology'] },
  { name: 'Fortis Hospital', lat: 12.9306, lng: 77.6835, capacity: 400, specialties: ['Oncology', 'Trauma'] },
  { name: 'Sakra World Hospital', lat: 12.9404, lng: 77.6843, capacity: 300, specialties: ['Cardiology', 'Neurology'] },
  { name: 'Apollo Hospital', lat: 12.9204, lng: 77.6259, capacity: 450, specialties: ['Multi-specialty', 'Pediatrics'] },
  { name: 'Narayana Health City', lat: 12.8978, lng: 77.6087, capacity: 600, specialties: ['Cardiology', 'Organ Transplant'] },
  { name: 'BGS Gleneagles Hospital', lat: 12.9199, lng: 77.4985, capacity: 250, specialties: ['Orthopedics', 'General'] },
  { name: 'Aster CMI Hospital', lat: 13.0437, lng: 77.5963, capacity: 350, specialties: ['Oncology', 'Emergency'] }
];

// 100 traffic signals along major Bangalore corridors
const SIGNALS = [
  // City Center - Around MG Road/Brigade Road area
  { name: 'MG Road Junction', lat: 12.9754, lng: 77.6069 },
  { name: 'Trinity Circle', lat: 12.9719, lng: 77.6091 },
  { name: 'Richmond Circle', lat: 12.9634, lng: 77.5985 },
  { name: 'Residency Road Signal', lat: 12.9678, lng: 77.6041 },
  { name: 'Brigade Road Junction', lat: 12.9716, lng: 77.5971 },
  { name: 'City Market Signal', lat: 12.9615, lng: 77.5835 },
  { name: 'Town Hall Signal', lat: 12.9745, lng: 77.5925 },
  { name: 'KR Market Signal', lat: 12.9612, lng: 77.5838 },
  { name: 'Chikpet Signal', lat: 12.9645, lng: 77.5785 },
  { name: 'Bangalore Club Junction', lat: 12.9815, lng: 77.6005 },
  { name: 'Shivajinagar Signal', lat: 12.9856, lng: 77.5963 },
  { name: 'Ulsoor Road', lat: 12.9804, lng: 77.6184 },
  { name: 'Majestic Signal', lat: 12.9776, lng: 77.5713 },
  { name: 'Basaveshwara Circle', lat: 12.9575, lng: 77.5875 },
  { name: 'Elephant Circle', lat: 12.9565, lng: 77.5905 },
  { name: 'Lalbagh Main Gate', lat: 12.9508, lng: 77.5845 },
  { name: 'South End Circle', lat: 12.9445, lng: 77.5928 },
  { name: 'Vasanth Nagar', lat: 12.9865, lng: 77.5905 },
  { name: 'Cantonment Signal', lat: 12.9910, lng: 77.6035 },
  { name: 'Fraser Town Signal', lat: 12.9950, lng: 77.6175 },
  { name: 'Cooke Town Signal', lat: 12.9875, lng: 77.6405 },
  { name: 'RT Nagar Signal', lat: 13.0205, lng: 77.5975 },
  { name: 'Sanjaynagar Signal', lat: 13.0235, lng: 77.5740 },
  { name: 'Malleshwaram 8th Cross', lat: 13.0030, lng: 77.5705 },
  { name: 'Sadashivanagar Signal', lat: 13.0110, lng: 77.5845 },
  { name: 'Yeshwantpur Junction', lat: 13.0285, lng: 77.5460 },
  { name: 'Mathikere Junction', lat: 13.0365, lng: 77.5585 },
  { name: 'Nagasandra Metro', lat: 13.0410, lng: 77.5365 },
  { name: 'Hebbal Flyover Signal', lat: 13.0450, lng: 77.5936 },
  { name: 'New BEL Road Signal', lat: 13.0353, lng: 77.5640 },
  // South Bangalore
  { name: 'JP Nagar Signal', lat: 12.9100, lng: 77.5853 },
  { name: 'Jayanagar 4th Block', lat: 12.9299, lng: 77.5831 },
  { name: 'Bannerghatta Road', lat: 12.8741, lng: 77.5977 },
  { name: 'Forum Junction', lat: 12.9345, lng: 77.6105 },
  { name: 'Madiwala Signal', lat: 12.9145, lng: 77.6185 },
  { name: 'Silk Board Junction', lat: 12.9172, lng: 77.6235 },
  { name: 'Hosur Road Signal', lat: 12.9115, lng: 77.6285 },
  { name: 'Koramangala 80ft Road', lat: 12.9352, lng: 77.6245 },
  { name: 'HSR Layout Signal', lat: 12.9120, lng: 77.6445 },
  { name: 'Agara Junction', lat: 12.9255, lng: 77.6515 },
  { name: 'Bellandur Junction', lat: 12.9350, lng: 77.6760 },
  { name: 'Marathahalli Bridge', lat: 12.9595, lng: 77.7015 },
  { name: 'Kadubeesanahalli Signal', lat: 12.9365, lng: 77.6785 },
  { name: 'Kaikondrahalli Signal', lat: 12.9385, lng: 77.6855 },
  { name: 'Sarjapur Road Signal', lat: 12.9135, lng: 77.6835 },
  { name: 'Kaikondrahalli Main', lat: 12.9320, lng: 77.6880 },
  // East Bangalore
  { name: 'Indiranagar 100ft Road', lat: 12.9784, lng: 77.6408 },
  { name: 'Kasthuri Nagar Signal', lat: 12.9525, lng: 77.6985 },
  { name: 'ITPL Main Gate', lat: 12.9848, lng: 77.7275 },
  { name: 'Mahadevapura Signal', lat: 13.0055, lng: 77.7010 },
  { name: 'Whitefield Signal', lat: 12.9698, lng: 77.7499 },
  { name: 'Airport Road Signal', lat: 12.9998, lng: 77.6398 },
  { name: 'Outer Ring Road', lat: 12.9552, lng: 77.6956 },
  { name: 'KR Puram Junction', lat: 13.0100, lng: 77.6800 },
  { name: 'Tin Factory Signal', lat: 13.0200, lng: 77.6500 },
  // West Bangalore
  { name: 'Electronic City Signal', lat: 12.8456, lng: 77.6603 },
  { name: 'Bannerghatta Junction', lat: 12.8650, lng: 77.6200 },
  { name: 'Begur Junction', lat: 12.8750, lng: 77.6100 },
  { name: 'Yediyur Signal', lat: 12.9200, lng: 77.5700 },
  { name: 'Uttarahalli Signal', lat: 12.8950, lng: 77.5350 },
  { name: 'Kengeri Junction', lat: 12.9050, lng: 77.4850 },
  { name: 'Rajarajeshwari Nagar', lat: 12.9250, lng: 77.5100 },
  { name: 'Nayandahalli', lat: 12.9450, lng: 77.5200 },
  // Additional major junctions
  { name: 'Hosahalli Signal', lat: 12.9600, lng: 77.5300 },
  { name: 'Magadi Road Signal', lat: 12.9700, lng: 77.5400 },
  { name: 'Vijayanagar Signal', lat: 12.9705, lng: 77.5350 },
  { name: 'Hosakerehalli Cross', lat: 12.9550, lng: 77.5450 },
  { name: 'Sumanahalli Junction', lat: 12.9750, lng: 77.5250 },
  { name: 'Peenya Industrial', lat: 13.0300, lng: 77.5200 },
  { name: 'Jalahalli Cross', lat: 13.0400, lng: 77.5500 },
  { name: 'Girinagar Signal', lat: 12.9400, lng: 77.5550 },
  { name: 'Kathriguppe Signal', lat: 12.9350, lng: 77.5650 },
  { name: 'Chikkalsandra Signal', lat: 12.9250, lng: 77.5750 },
  { name: 'Uttarahalli Main', lat: 12.9050, lng: 77.5450 },
  // More signals added
  { name: 'Ramamurthy Nagar', lat: 13.0150, lng: 77.6900 },
  { name: 'Hoodi Junction', lat: 12.9900, lng: 77.7200 },
  { name: 'Sadaramangala', lat: 12.9750, lng: 77.7000 },
  { name: 'Benniganahalli', lat: 13.0000, lng: 77.6600 },
  { name: 'Veerannapalya', lat: 12.9850, lng: 77.6400 },
  { name: 'Kacharakanahalli', lat: 12.9750, lng: 77.6600 },
  { name: 'New Thippasandra', lat: 12.9650, lng: 77.6450 },
  { name: 'Koramangala 5th Block', lat: 12.9350, lng: 77.6100 },
  { name: 'Koramangala 6th Block', lat: 12.9300, lng: 77.6150 },
  { name: 'Koramangala 7th Block', lat: 12.9250, lng: 77.6200 },
  { name: 'Ejipura Signal', lat: 12.9450, lng: 77.6150 },
  { name: 'Halasuru Gate', lat: 12.9850, lng: 77.6250 },
  { name: 'Sanjay Nagar Police', lat: 13.0200, lng: 77.5800 },
  { name: 'Palace Grounds', lat: 12.9950, lng: 77.5850 },
  { name: 'Mekhri Circle', lat: 13.0350, lng: 77.5950 },
  { name: 'Hebbal Flyover North', lat: 13.0500, lng: 77.5900 },
  { name: 'BEL Circle', lat: 13.0400, lng: 77.5700 },
  { name: 'Ganganagar Signal', lat: 13.0500, lng: 77.5600 },
  { name: 'Palace Guttahalli', lat: 13.0000, lng: 77.5750 }
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/green_corridor');
  console.log('✅ Connected to MongoDB');

  // Clear all
  await Promise.all([
    Ambulance.deleteMany({}),
    Hospital.deleteMany({}),
    TrafficSignal.deleteMany({}),
    Incident.deleteMany({})
  ]);
  console.log('🧹 Cleared existing data');

  // Seed ambulances
  const hashedPw = await bcrypt.hash('password123', 10);
  const ambDocs = AMBULANCES.map(a => ({ ...a, driverPassword: hashedPw }));
  await Ambulance.insertMany(ambDocs);
  console.log(`✅ Seeded ${ambDocs.length} ambulances (password: password123)`);

  // Seed hospitals
  await Hospital.insertMany(HOSPITALS);
  console.log(`✅ Seeded ${HOSPITALS.length} hospitals`);

  // Seed traffic signals
  await TrafficSignal.insertMany(SIGNALS.map(s => ({ ...s, state: 'red' })));
  console.log(`✅ Seeded ${SIGNALS.length} traffic signals`);

  mongoose.disconnect();
  console.log('\n🎉 Seed complete!\nLogin credentials: email as listed, password: password123');
}

seed().catch(err => { console.error(err); process.exit(1); });
