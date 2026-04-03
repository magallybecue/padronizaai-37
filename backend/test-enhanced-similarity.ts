import { enhancedMatchingService } from './src/lib/matching/enhanced-matching-service';

async function testEnhancedSimilarity() {
  console.log('🧪 Testando o Enhanced Matching Service\n');

  // Casos de teste com abreviações
  const testCases = [
    // Teste de abreviações
    { input: 'PARAF. M8', expected: 'parafuso' },
    { input: 'VALV. REG.', expected: 'valvula reguladora' },
    { input: 'ARR. LISA 6MM', expected: 'arruela lisa' },
    { input: 'CABO ACO INOX', expected: 'cabo aco inoxidavel' },
    
    // Teste de textos com acentos
    { input: 'VÁLVULA REGULADORA', expected: 'valvula reguladora' },
    { input: 'PARAFUSO SEXTAVADO', expected: 'parafuso sextavado' },
    { input: 'TUBO DE AÇO', expected: 'tubo aco' },
    
    // Teste de variações textuais
    { input: 'PARAFUSO M6 SEXTAVADO', expected: 'parafuso' },
    { input: 'CABO DE AÇO 3MM', expected: 'cabo aco' },
    { input: 'TINTA BRANCA LATEX', expected: 'tinta branco' },
    
    // Teste de casos complexos
    { input: 'PARAF SEXT M8 INOX', expected: 'parafuso sextavado inoxidavel' },
    { input: 'VALV REG CIL GAS', expected: 'valvula reguladora cilindro gas' }
  ];

  console.log('='.repeat(80));
  console.log('TESTES DE NORMALIZAÇÃO E EXPANSÃO DE ABREVIAÇÕES');
  console.log('='.repeat(80));

  for (const testCase of testCases) {
    console.log(`\n🔍 Teste: "${testCase.input}"`);
    
    try {
      const result = await enhancedMatchingService.performMatching(
        testCase.input, 
        'FUZZY', 
        0.70
      );
      
      console.log(`   ✅ Resultado: ${result.description || 'Não encontrado'}`);
      console.log(`   📊 Score: ${result.score}%`);
      console.log(`   ⚙️  Algoritmo: ${result.algorithm}`);
      
      if (result.code) {
        console.log(`   🏷️  Código CATMAT: ${result.code}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Erro: ${error}`);
    }
  }

  // Teste de busca por materiais
  console.log('\n' + '='.repeat(80));
  console.log('TESTE DE BUSCA POR MATERIAIS');
  console.log('='.repeat(80));

  const searchQueries = ['parafuso', 'valvula', 'cabo aco', 'tinta'];
  
  for (const query of searchQueries) {
    console.log(`\n🔍 Buscando: "${query}"`);
    
    try {
      const materials = await enhancedMatchingService.searchMaterials(query, 3);
      
      if (materials.length > 0) {
        console.log(`   ✅ Encontrados ${materials.length} materiais:`);
        materials.forEach((material, index) => {
          console.log(`      ${index + 1}. [${material.codigoItem}] ${material.descricaoItem}`);
        });
      } else {
        console.log(`   ❌ Nenhum material encontrado`);
      }
      
    } catch (error) {
      console.log(`   ❌ Erro na busca: ${error}`);
    }
  }

  // Teste de comparação de algoritmos
  console.log('\n' + '='.repeat(80));
  console.log('COMPARAÇÃO DE ALGORITMOS');
  console.log('='.repeat(80));

  const algorithms = ['EXACT', 'FUZZY', 'KEYWORD', 'SIMILARITY'];
  const testMaterial = 'PARAFUSO SEXTAVADO M8';

  for (const algorithm of algorithms) {
    console.log(`\n⚙️ Algoritmo: ${algorithm}`);
    console.log(`   Input: "${testMaterial}"`);
    
    try {
      const result = await enhancedMatchingService.performMatching(
        testMaterial, 
        algorithm, 
        0.70
      );
      
      console.log(`   Resultado: ${result.description || 'Não encontrado'}`);
      console.log(`   Score: ${result.score}%`);
      
    } catch (error) {
      console.log(`   ❌ Erro: ${error}`);
    }
  }

  // Estatísticas do serviço
  console.log('\n' + '='.repeat(80));
  console.log('ESTATÍSTICAS DO SERVIÇO');
  console.log('='.repeat(80));

  const stats = enhancedMatchingService.getStats();
  console.log(JSON.stringify(stats, null, 2));
}

testEnhancedSimilarity()
  .catch(console.error)
  .finally(() => process.exit(0));