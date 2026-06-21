import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const existingCount = await prisma.user.count()
  
  if (existingCount > 0) {
    console.log(`Ya existen ${existingCount} usuarios en la base de datos.`)
    const users = await prisma.user.findMany({ select: { email: true, name: true, role: true } })
    console.log('Usuarios existentes:', users)
    return
  }

  const hashedPassword = await bcrypt.hash('admin123', 12)

  const admin = await prisma.user.create({
    data: {
      email: 'admin@lagunanorte.cl',
      name: 'Administrador',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  console.log('✅ Usuario administrador creado:')
  console.log('   Email: admin@lagunanorte.cl')
  console.log('   Contraseña: admin123')
  console.log('   Rol: ADMIN')
  console.log('')
  console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer inicio de sesión')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
