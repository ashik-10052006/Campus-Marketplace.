const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');

const defaultCategories = [
  { name: 'Books', description: 'Academic textbooks, novels, and course guides' },
  { name: 'Electronics', description: 'Laptops, monitors, chargers, headphones, and components' },
  { name: 'Furniture', description: 'Dorm desks, ergonomic chairs, lamps, and organizers' },
  { name: 'Clothing', description: 'Campus hoodies, jackets, formal wear, and shoes' },
  { name: 'Bicycles', description: 'Campus bikes, locks, helmets, and repair kits' },
  { name: 'Calculators', description: 'Scientific, graphing, and financial calculators' },
  { name: 'Accessories', description: 'Backpacks, water bottles, umbrellas, and tech sleeves' },
  { name: 'Stationery', description: 'Notebooks, binders, scientific drawing tools, and pens' },
  { name: 'Hostel Items', description: 'Mini-fridges, kettles, beddings, and storage bins' },
  { name: 'Other', description: 'Miscellaneous student gear and materials' },
];

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus_marketplace';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected for seeding...');

    // 1. Seed Categories (upsert by name)
    console.log('Seeding categories...');
    for (const cat of defaultCategories) {
      await Category.findOneAndUpdate({ name: cat.name }, cat, { upsert: true, new: true });
    }
    console.log(`Successfully seeded ${defaultCategories.length} categories.`);

    // 2. Seed Default Administrator Account
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@campus.edu').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Campus2026';
    const adminName = process.env.ADMIN_NAME || 'Campus Administrator';
    const adminPhone = process.env.ADMIN_PHONE || '+1 (555) 019-2834';

    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      adminUser = await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        phone: adminPhone,
        role: 'admin',
      });
      console.log(`Created default admin account: ${adminEmail}`);
    } else {
      adminUser.role = 'admin';
      await adminUser.save();
      console.log(`Admin account confirmed: ${adminEmail}`);
    }

    // 3. Seed Sample Student Account and Listings if DB is fresh
    const sampleStudentEmail = 'student@campus.edu';
    let sampleStudent = await User.findOne({ email: sampleStudentEmail });
    if (!sampleStudent) {
      sampleStudent = await User.create({
        name: 'Alex Johnson',
        email: sampleStudentEmail,
        password: 'StudentPass123!',
        phone: '+1 (555) 012-3456',
        role: 'student',
      });
      console.log(`Created sample student account: ${sampleStudentEmail}`);
    }

    const booksCategory = await Category.findOne({ name: 'Books' });
    const calcCategory = await Category.findOne({ name: 'Calculators' });
    const elecCategory = await Category.findOne({ name: 'Electronics' });

    const sampleProductCount = await Product.countDocuments();
    if (sampleProductCount === 0 && booksCategory && calcCategory && elecCategory) {
      console.log('Seeding initial sample listings...');
      await Product.create([
        {
          seller: sampleStudent._id,
          name: 'Stewart Calculus: Early Transcendentals (9th Edition)',
          description: 'Hardcover textbook used for MATH 101/102. Clean pages, no highlighting, excellent condition.',
          price: 1200.0,
          category: booksCategory._id,
          condition: 'LIKE_NEW',
          imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
          status: 'AVAILABLE',
        },
        {
          seller: sampleStudent._id,
          name: 'TI-84 Plus CE Color Graphing Calculator',
          description: 'Works perfectly, battery holds charge for weeks. Includes charging cable and slide case.',
          price: 5500.0,
          category: calcCategory._id,
          condition: 'GOOD',
          imageUrl: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=600&auto=format&fit=crop&q=80',
          status: 'AVAILABLE',
        },
        {
          seller: sampleStudent._id,
          name: 'Dell 24-inch FHD IPS Monitor with HDMI',
          description: 'Great external dorm monitor for laptop multitasking. 75Hz refresh rate with crisp colors.',
          price: 7500.0,
          category: elecCategory._id,
          condition: 'LIKE_NEW',
          imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80',
          status: 'AVAILABLE',
        },
      ]);
      console.log('Sample listings seeded successfully.');
    }

    console.log('Database seeding complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
