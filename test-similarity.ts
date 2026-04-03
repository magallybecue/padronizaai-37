import { prisma } from './src/lib/prisma';
import { UploadProcessor } from './src/lib/services/upload-processor';

async function testSimilarity() {
  const processor = new UploadProcessor();
  
  console.log('🧪 Teste 1: Match exato');
  const test1 = await processor.performMatching('PARAFUSO SEXTAVADO M8', 'FUZZY', 0.85);
  console.log('Resultado:', test1);
  
  console.log('\n🧪 Teste 2: Buscar parafusos no banco');
  const parafusos = await prisma.catmatMaterial.findMany({
    where: {
      statusItem: true,
      descricaoItem: { contains: 'parafuso', mode: 'insensitive' }
    },
    take: 5
  });
  
  console.log(`Parafusos encontrados: ${parafusos.length}`);
  parafusos.forEach((p, i) => {
    console.log(`${i+1}. ${p.codigoItem} - ${p.descricaoItem}`);
  });
  
  if (parafusos.length > 0) {
    console.log('\n🧪 Teste 3: Match com parafuso real');
    const realParafuso = parafusos[0];
    const test3 = await processor.performMatching(realParafuso.descricaoItem, 'FUZZY', 0.85);
    console.log('Input:', realParafuso.descricaoItem);
    console.log('Output:', test3);
    console.log('Match correto?', test3.code === realParafuso.codigoItem ? '✅' : '❌');
  }
}

testSimilarity().catch(console.error).finally(() => process.exit(0));