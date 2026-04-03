// Teste simples da normalização sem acesso ao banco
const abbreviationsMap = new Map([
  ['paraf', 'parafuso'],
  ['valv', 'valvula'],
  ['reg', 'reguladora'],
  ['arr', 'arruela'],
  ['sext', 'sextavado'],
  ['inox', 'inoxidavel']
]);

function normalizeText(text: string): string {
  let normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, ' ') // Remove pontuação
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim()
  
  // Expandir abreviações
  normalized = expandAbbreviations(normalized)
  
  return normalized
}

function expandAbbreviations(text: string): string {
  const words = text.split(' ')
  const expandedWords = words.map(word => {
    // Verificar se é uma abreviação exata
    if (abbreviationsMap.has(word)) {
      return abbreviationsMap.get(word)!
    }
    
    // Verificar se termina com ponto (abreviação com ponto)
    const wordWithoutDot = word.replace(/\.$/, '')
    if (word !== wordWithoutDot && abbreviationsMap.has(wordWithoutDot)) {
      return abbreviationsMap.get(wordWithoutDot)!
    }
    
    // Verificar abreviações parciais
    for (const [abbrev, full] of Array.from(abbreviationsMap.entries())) {
      if (word.startsWith(abbrev) && word.length <= abbrev.length + 1) {
        return full
      }
    }
    
    return word
  })
  
  return expandedWords.join(' ')
}

// Testes
console.log('🧪 Testando Normalização e Expansão de Abreviações\n');

const testCases = [
  'PARAF. M8',
  'VALV. REG.',
  'ARR. SEXT.',
  'VÁLVULA REGULADORA',
  'PARAFUSO SEXTAVADO',
  'CABO AÇO INOX',
  'PARAF SEXT M8 INOX'
];

testCases.forEach(test => {
  const normalized = normalizeText(test);
  console.log(`"${test}" => "${normalized}"`);
});

console.log('\n✅ Teste de normalização concluído!');