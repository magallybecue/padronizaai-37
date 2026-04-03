import { enhancedMatchingService } from './src/lib/matching/enhanced-matching-service'

async function tryMatch(text: string) {
  console.log(`\nTesting: ${text}`)
  console.log('---')
  
  const result = await enhancedMatchingService.performMatching(text, 'FUZZY', 0.6)
  
  console.log(`Score: ${result.score}`)
  console.log(`Algorithm: ${result.algorithm}`)
  console.log(`Matched: ${result.description}`)
}

async function main() {
  await tryMatch("TUBO AL ALTURA: 1 1/4 POL COMPRIMENTO: 6 M FORMATO: REDONDO ESPEC 079 MM")
  await tryMatch("DIÂMETRO EXTERNO: 254 MM ESPESSURA PAREDES: 165 MM")
  await tryMatch("CARACTERÍSTICAS ADICIONAIS: MECÂNICO LAMINADO")
  process.exit(0)
}

main().catch(console.error)
