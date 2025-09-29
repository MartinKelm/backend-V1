require('dotenv').config();

const { connectDatabase, getPrisma } = require('../lib/database');
const { hashPassword } = require('../lib/password');

const setupAdmin = async () => {
  try {
    console.log('🔧 Setting up admin user...');
    
    // Connect to database
    await connectDatabase();
    const prisma = getPrisma();

    // Get admin details from environment variables
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@socialmediakampagnen.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';
    const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';
    const adminLastName = process.env.ADMIN_LAST_NAME || 'User';

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      console.log(`⚠️ Admin user already exists: ${adminEmail}`);
      
      // Update to ensure they have SUPER_ADMIN role
      if (existingAdmin.role !== 'SUPER_ADMIN') {
        await prisma.user.update({
          where: { email: adminEmail },
          data: { role: 'SUPER_ADMIN', isActive: true }
        });
        console.log(`✅ Updated ${adminEmail} to SUPER_ADMIN role`);
      }
      
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(adminPassword);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        firstName: adminFirstName,
        lastName: adminLastName,
        email: adminEmail,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        company: 'SMK Administration',
        isActive: true
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true
      }
    });

    console.log('✅ Admin user created successfully:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Created: ${adminUser.createdAt}`);
    
    console.log('\n🔐 Admin Login Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('\n⚠️ Please change the admin password after first login!');

  } catch (error) {
    console.error('❌ Failed to setup admin user:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

// Run the setup
setupAdmin();
