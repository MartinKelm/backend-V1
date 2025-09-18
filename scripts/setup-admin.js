import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const prisma = new PrismaClient()

async function setupAdmin() {
  try {
    console.log('🔧 Setting up admin user...')

    // Find the admin user by email
    const adminEmail = 'admin@socialmediakampagnen.com'
    
    const user = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (!user) {
      console.error(`❌ User with email ${adminEmail} not found`)
      console.log('Please register the admin user first with:')
      console.log(`curl -X POST http://localhost:3001/api/auth/register -H "Content-Type: application/json" -d '{"email":"${adminEmail}","password":"AdminPassword123!","firstName":"Admin","lastName":"User","company":"SMK GmbH"}'`)
      return
    }

    // Update user role to SUPER_ADMIN
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { 
        role: 'SUPER_ADMIN',
        status: 'ACTIVE'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        company: true
      }
    })

    console.log('✅ Admin user setup completed!')
    console.log('📋 Admin user details:')
    console.log(JSON.stringify(updatedUser, null, 2))

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: updatedUser.id,
        action: 'ROLE_CHANGE',
        resource: 'ROLE',
        details: {
          oldRole: user.role,
          newRole: 'SUPER_ADMIN',
          setupScript: true
        },
        ipAddress: 'localhost',
        userAgent: 'setup-script'
      }
    })

    console.log('📝 Audit log entry created')

  } catch (error) {
    console.error('❌ Error setting up admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupAdmin()
