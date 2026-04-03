import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'temp@example.com' },
    update: {},
    create: {
      id: 'temp-user-id',
      email: 'temp@example.com',
      name: 'Usuário Temporário',
      password: 'temp123',
      plan: 'FREE'
    }
  })
  
  console.log('Usuário criado:', user)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
