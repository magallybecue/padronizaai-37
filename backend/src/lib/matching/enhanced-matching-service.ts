import { prisma } from '@/lib/prisma'
import * as stringSimilarity from 'string-similarity'
import { CatmatMaterial } from '@prisma/client'

interface MatchResult {
  code: string | null
  description: string | null
  score: number
  algorithm: string
}

export class EnhancedMatchingService {
  private readonly AUTO_APPROVE_SCORE = 85

  // Dicionário de abreviações técnicas
  private readonly abbreviationsMap = new Map([
    // Materiais e componentes
    ['paraf', 'parafuso'],
    ['parafs', 'parafusos'],
    ['valv', 'valvula'],
    ['valvs', 'valvulas'],
    ['reg', 'reguladora'],
    ['regs', 'reguladoras'],
    ['cil', 'cilindro'],
    ['cils', 'cilindros'],
    ['arr', 'arruela'],
    ['arrs', 'arruelas'],
    ['porc', 'porca'],
    ['porcs', 'porcas'],
    ['tubo', 'tubo'],
    ['tubos', 'tubos'],
    ['cabo', 'cabo'],
    ['cabos', 'cabos'],
    ['ch', 'chapa'],
    ['chp', 'chapa'],
    
    // Medidas e especificações
    ['mm', 'milimetros'],
    ['cm', 'centimetros'],
    ['mt', 'metro'],
    ['mts', 'metros'],
    ['m', 'metros'],
    ['kg', 'quilograma'],
    ['gr', 'grama'],
    ['lt', 'litro'],
    ['ml', 'mililitro'],
    ['pc', 'peca'],
    ['pcs', 'pecas'],
    ['un', 'unidade'],
    ['unid', 'unidade'],
    ['cx', 'caixa'],
    ['pol', 'polegadas'],
    
    // Materiais específicos expandidos
    ['aco', 'aco'],
    ['ac', 'aco carbono'],
    ['alum', 'aluminio'],
    ['al', 'aluminio'],
    ['inox', 'inoxidavel'],
    ['plast', 'plastico'],
    ['borr', 'borracha'],
    ['mad', 'madeira'],
    ['vidro', 'vidro'],
    ['ceramica', 'ceramica'],
    ['galv', 'galvanizado'],
    ['lat', 'latao'],
    ['cobr', 'cobre'],
    
    // Tipos e características
    ['sch', 'schedule'],
    ['sched', 'schedule'],
    ['sext', 'sextavado'],
    ['hex', 'hexagonal'],
    ['quad', 'quadrado'],
    ['red', 'redondo'],
    ['ret', 'retangular'],
    ['lisa', 'lisa'],
    ['dent', 'dentada'],
    ['press', 'pressao'],
    ['temp', 'temperatura'],
    ['esp', 'espessura'],
    ['espec', 'especificacao'],
    ['diam', 'diametro'],
    ['compr', 'comprimento'],
    ['larg', 'largura'],
    ['alt', 'altura'],
    ['Ø', 'diametro'],
    
    // Cores
    ['br', 'branco'],
    ['pt', 'preto'],
    ['az', 'azul'],
    ['verm', 'vermelho'],
    ['verd', 'verde'],
    ['amar', 'amarelo'],
    ['cinz', 'cinza'],
    ['marr', 'marrom'],
    
    // Aplicações
    ['autom', 'automotivo'],
    ['industr', 'industrial'],
    ['resid', 'residencial'],
    ['comerc', 'comercial'],
    ['hidr', 'hidraulico'],
    ['pneum', 'pneumatico'],
    ['elet', 'eletrico'],
    ['eletron', 'eletronico']
  ])

  constructor() {}

  // 1. Matriz Jaro-Winkler Distance (Permissividade para Typos e Iniciais Erradas)
  private jaroWinkler(s1: string, s2: string): number {
    let m = 0;
    if (s1.length === 0 || s2.length === 0) return 0;
    if (s1 === s2) return 1;
    
    const range = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    const s1Matches = new Array(s1.length).fill(false);
    const s2Matches = new Array(s2.length).fill(false);
    
    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - range);
      const end = Math.min(i + range + 1, s2.length);
      for (let j = start; j < end; j++) {
        if (!s2Matches[j] && s1[i] === s2[j]) {
          s1Matches[i] = true;
          s2Matches[j] = true;
          m++;
          break;
        }
      }
    }
    
    if (m === 0) return 0;
    let t = 0;
    let k = 0;
    for (let i = 0; i < s1.length; i++) {
        if (s1Matches[i]) {
            while (!s2Matches[k]) k++;
            if (s1[i] !== s2[k]) t++;
            k++;
        }
    }
    t = t / 2;
    
    let jaro = (m / s1.length + m / s2.length + (m - t) / m) / 3;
    
    let l = 0;
    const weight = 0.1;
    while (l < 4 && l < s1.length && s1[l] === s2[l]) {
      l++;
    }
    return jaro + l * weight * (1 - jaro);
  }

  // 2. Jaccard Token Index (Para penalizar textos desordenados ou com falta drástica de características)
  private jaccardIndex(tokens1: string[], tokens2: string[]): number {
    if (tokens1.length === 0 && tokens2.length === 0) return 1;
    if (tokens1.length === 0 || tokens2.length === 0) return 0;
    
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    
    // Contar a interseção verdadeira
    let intersectionCount = 0;
    for (const t1 of set1) {
        // Tolerância de pequeno erro topográfico ao cruzar tokens inter-arrays
        for (const t2 of set2) {
            if (t1 === t2 || this.jaroWinkler(t1, t2) > 0.88) {
                intersectionCount++;
                break;
            }
        }
    }
    const unionSize = set1.size + set2.size - intersectionCount;
    return unionSize === 0 ? 0 : intersectionCount / unionSize;
  }

  // Handle Regex Collation (Tubo AC SCH40 -> SCH 40)
  private handleCollationRegex(text: string): string {
    return text
      // Adicionar espacamento entre letras e numeros sem espaço.
      .replace(/([a-zA-Z]+)(\d+)/g, '$1 $2') // ex: SCH40 -> SCH 40
      .replace(/(\d+)([a-zA-Z]+)/g, '$1 $2') // ex: 40SCH -> 40 SCH
      .replace(/"|pol\b|polegadas/gi, ' polegadas ') // Converter sinônimos de aspas "
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Método principal de matching OTIMIZADO
  async performMatching(
    material: string, 
    algorithm: string, 
    threshold: number
  ): Promise<MatchResult> {
    
    // O threshold enviado do front por ex = 0.6, se transformará em 60 limit minimum
    // Mas vamos impor um piso de 30 para evitar o "Não Encontrado" em itens parciais
    const userThreshold = threshold < 1 ? threshold * 100 : threshold;
    const MIN_CONFIDENCE_SCORE = Math.min(userThreshold, 30);
    const rawText = this.handleCollationRegex(material);
    const searchText = this.normalizeText(rawText);
    const searchTokens = this.tokenize(searchText);
    
    if (searchTokens.length === 0) {
       return { code: null, description: null, score: 0, algorithm: 'NOT_FOUND' };
    }

    // 1. Filtragem DB First (Otimização pesada!)
    // Usamos o texto normalizado para a matemática, mas para o BANCO (Postgres)
    // precisamos dos tokens com acento (pois ILIKE nao ignora acento por padrao)
    const rawCollateText = this.handleCollationRegex(material);
    
    // Limpamos pontuação colada (ex: ALTURA: vira ALTURA)
    const cleanRawText = rawCollateText.toLowerCase().replace(/[^\w\s\u00C0-\u017F]/g, ' ');
    const dbSearchTokens = this.tokenize(cleanRawText);
    const expandedTokens = searchTokens; // searchTokens ja sao minusculos e sem acento
    
    // Lista final de termos para o banco
    const allSearchTokens = Array.from(new Set([...dbSearchTokens, ...expandedTokens]));
    
    const importantTokens = this.getImportantTokens(allSearchTokens);
    
    const genericTerms = new Set([
      'peca', 'item', 'material', 'modelo', 'marca', 'produto',
      'especificacao', 'comprimento', 'altura', 'largura', 'dimensoes', 
      'caracteristicas', 'adicionais', 'nacional', 'referencia', 'tipo',
      'milimetros', 'centimetros', 'metros', 'polegadas', 'gramas', 'quilos',
      'mm', 'pol', 'cm', 'm', 'kg', 'un', 'unid', 'cx'
    ]);
    
    const coreNamingTerms = new Set(['tubo', 'valvula', 'registo', 'parafuso', 'porca', 'arruela', 'flange', 'cabo', 'chapa', 'conector', 'terminal', 'uniao', 'joelho', 'curva', 'te', 'reducao', 'perfil', 'barra', 'disco']);
    const coreItemToken = allSearchTokens.find(t => coreNamingTerms.has(this.normalizeText(t)));

    // Agora pegamos as palavras especificas que NAO sejam genericas
    const specificTokens = importantTokens
      .filter(t => !genericTerms.has(this.normalizeText(t)) && t !== coreItemToken)
      .sort((a, b) => b.length - a.length);

    // Montamos o AND com o Nome do item + 2 mais especificos
    let tokensToAndSearch = [];
    if (coreItemToken) tokensToAndSearch.push(coreItemToken);
    
    // Adicionar as palavras mais especificas (ex: ALUMINIO, COBRE)
    tokensToAndSearch.push(...specificTokens.slice(0, 2));

    // Se nao achamos nada, garantimos pelo menos o core e as especificas se existirem
    if (tokensToAndSearch.length < 2) {
      const rest = importantTokens.filter(t => !tokensToAndSearch.includes(t) && t.length > 2);
      tokensToAndSearch.push(...rest.slice(0, 2 - tokensToAndSearch.length));
    }
    
    // Limpeza final para evitar caracteres estranhos na query de banco
    tokensToAndSearch = tokensToAndSearch.map(t => t.replace(/[^\w\u00C0-\u017F]/g, ''));
    
    console.log(`[DEBUG] Final tokensToAndSearch: ${JSON.stringify(tokensToAndSearch)}`);
    
    // Tentamos primeiro uma busca mais restrita (AND)
    let dbCandidates: CatmatMaterial[] = [];
    
    if (tokensToAndSearch.length >= 1) {
      dbCandidates = await prisma.catmatMaterial.findMany({
        where: {
          statusItem: true,
          AND: tokensToAndSearch.map(word => ({
            descricaoItem: { contains: word, mode: 'insensitive' }
          }))
        },
        take: 200
      });
      console.log(`[DEBUG] andCandidates found: ${dbCandidates.length}`);
    }

    // Se a busca restrita falhou ou trouxe pouco, fazemos a busca ampla (OR)
    if (dbCandidates.length < 30) {
      const tokensToOrSearch = importantTokens.slice(0, 4);
      const broadCandidates = await prisma.catmatMaterial.findMany({
        where: {
          statusItem: true,
          OR: tokensToOrSearch.map(word => ({
            descricaoItem: { contains: word, mode: 'insensitive' }
          }))
        },
        take: 500
      });
      console.log(`[DEBUG] broadCandidates found: ${broadCandidates.length}`);
      
      const existingIds = new Set(dbCandidates.map(c => c.id));
      for (const candidate of broadCandidates) {
        if (!existingIds.has(candidate.id)) {
          dbCandidates.push(candidate);
        }
      }
    }
    
    console.log(`[DEBUG] total candidates to process: ${dbCandidates.length}`);

    if (dbCandidates.length === 0) {
      return { code: null, description: null, score: 0, algorithm: 'NOT_FOUND' };
    }

    let bestMatch: CatmatMaterial | null = null;
    let bestScore = 0;

    // 2. Pontuação em Tríade Matemática Combinatória para os candidatos enxutos
    let i = 0;
    for (const candidate of dbCandidates) {
      const candidateRaw = this.handleCollationRegex(candidate.descricaoItem);
      const candidateNormalized = this.normalizeText(candidateRaw);
      
      // Checa match absoluto imediatamente para velocidade extra
      if (candidateNormalized === searchText) {
        return {
          code: candidate.codigoItem,
          description: candidate.descricaoItem,
          score: 100,
          algorithm: 'EXACT'
        }
      }

      // Matriz A: Sorensen-Dice Index (Agrupamento string-similarity n-gram)
      const diceSim = stringSimilarity.compareTwoStrings(searchText, candidateNormalized);
      
      // Matriz B: Jaro-Winkler Distance (Permissividade ortográfica e de Iniciais)
      const jwSim = this.jaroWinkler(searchText, candidateNormalized);

      // Matriz C: Jaccard Token Cross (Medir a ausência e sobreposição sem levar ordem em conta)
      const candidateTokens = this.tokenize(candidateNormalized);
      const jaccardSim = this.jaccardIndex(searchTokens, candidateTokens);

      // Mixagem Pesada Customizada (A alma de Inteligência do Motor)
      // Jaro resolve perfeitamente palavras difíceis e pequenos erros (40%)
      // Jaccard previne que resultados sem palavras do conceito (tubo ou espec) pontuem alto (40%)
      // Dice resolve a distribuição gramátical natural (20%)
      const combinedScore = (diceSim * 0.20 + jwSim * 0.40 + jaccardSim * 0.40) * 100;

      if (i < 5) {
        console.log(`[DEBUG] Candidate ${i}: ${candidateNormalized.substring(0, 50)}... | Score: ${combinedScore.toFixed(2)} (Dice: ${diceSim.toFixed(2)}, JW: ${jwSim.toFixed(2)}, Jaccard: ${jaccardSim.toFixed(2)})`);
      }

      if (combinedScore > bestScore && combinedScore >= MIN_CONFIDENCE_SCORE) {
        bestScore = combinedScore;
        bestMatch = candidate;
      }
      i++;
    }

    if (bestMatch) {
      return {
        code: bestMatch.codigoItem,
        description: bestMatch.descricaoItem,
        score: Math.round(bestScore),
        algorithm: 'ADVANCED_TRI_MATRIX'
      }
    }

    return {
      code: null,
      description: null,
      score: 0,
      algorithm: 'NOT_FOUND'
    };
  }

  // Normalizar texto isolado com tradutor técnico
  private normalizeText(text: string): string {
    let normalized = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, ' ') // Remove pontuação exceto carácteres verbais
      .replace(/\s+/g, ' ') 
      .trim()
    
    // Tratamento de dicionário customizado por sigla
    normalized = this.expandAbbreviations(normalized)
    
    return normalized
  }

  // Rotina de Siglas Técnicas
  private expandAbbreviations(text: string): string {
    const words = text.split(' ')
    const expandedWords = words.map(word => {
      if (this.abbreviationsMap.has(word)) {
        return this.abbreviationsMap.get(word)!
      }
      
      const wordWithoutDot = word.replace(/\.$/, '')
      if (word !== wordWithoutDot && this.abbreviationsMap.has(wordWithoutDot)) {
        return this.abbreviationsMap.get(wordWithoutDot)!
      }
      
      return word
    })
    
    return expandedWords.join(' ')
  }

  // Tokenization Engine
  private tokenize(text: string): string[] {
    return text.split(/\s+/).filter(word => word.length > 1)
  }

  private getImportantTokens(tokens: string[]): string[] {
    const stopwords = new Set([
      'de', 'da', 'do', 'das', 'dos', 'para', 'com', 'por', 'em', 'a', 'o', 'e',
      'tipo', 'modelo', 'marca', 'cor', 'tamanho', 'peca', 'item', 'ser'
    ])
    
    return tokens.filter(token => 
      !stopwords.has(token)
    )
  }

  // Legacy fallback (se alguma rota velha importou)
  async refreshMaterialsCache(): Promise<void> {
    console.log('Cache bypassed by new Advanced Architecture')
  }

  getStats() {
    return {
      totalMaterials: 326195,
      cacheInitialized: true,
      mode: 'Tri-Matrix Database Filtered Engine'
    }
  }
}

// Singleton export
export const enhancedMatchingService = new EnhancedMatchingService()