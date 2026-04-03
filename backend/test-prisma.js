const { PrismaClient } = require('@prisma/client')

async function testConnection() {
  const prisma = new PrismaClient()
  
  try {
    console.log('Testing Prisma connection...')
    
    // Teste básico de conexão
    await prisma.$connect()
    console.log('✅ Connected to database')
    
    // Teste de query simples
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Query test:', result)
    
    // Conte uploads
    const uploadCount = await prisma.upload.count()
    console.log('✅ Upload count:', uploadCount)
    
    // Conte materiais
    const materialCount = await prisma.catmatMaterial.count()
    console.log('✅ Material count:', materialCount)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
