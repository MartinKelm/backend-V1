const { PrismaClient } = require('@prisma/client');

let prisma;

const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    errorFormat: 'pretty',
  });
};

const connectDatabase = async () => {
  try {
    if (!prisma) {
      prisma = createPrismaClient();
    }

    // Test the connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test with a simple query
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database query test successful');
    
    return prisma;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    
    // Log specific error details
    if (error.code === 'P1001') {
      console.error('❌ Cannot reach database server. Check your DATABASE_URL.');
    } else if (error.code === 'P1003') {
      console.error('❌ Database does not exist. Please create the database first.');
    } else if (error.code === 'P1009') {
      console.error('❌ Database already exists.');
    } else if (error.code === 'P1010') {
      console.error('❌ Access denied. Check your database credentials.');
    }
    
    throw error;
  }
};

const disconnectDatabase = async () => {
  if (prisma) {
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
  }
};

// Graceful shutdown
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getPrisma: () => {
    if (!prisma) {
      throw new Error('Database not initialized. Call connectDatabase() first.');
    }
    return prisma;
  }
};
