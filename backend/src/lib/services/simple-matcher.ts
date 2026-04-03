
export interface MatchResult {
  code: string | null
  description: string | null
  score: number
}

export class SimpleMatcher {

  async findMatch(material: string, algorithm: string, threshold: number): Promise<MatchResult> {
    const { prisma } = await import('@/lib/prisma')

    const materialLower = material.toLowerCase().trim()

    if (!materialLower) {
      return { code: null, description: null, score: 0 }
    }

    // Buscar materiais no banco com novos campos
    const materials = await prisma.catmatMaterial.findMany({
      where: {
        statusItem: true, // Apenas materiais ativos
        OR: [
          { descricaoItem: { contains: materialLower, mode: 'insensitive' } },
          { keywords: { has: materialLower } },
          { Categoria: { contains: materialLower, mode: 'insensitive' } }
        ]
      },
      take: 50
    })

    let bestMatch: MatchResult = { code: null, description: null, score: 0 }

    for (const item of materials) {n
      let score = 0

      if (algorithm === 'EXACT') {
        if (item.descricaoItem.toLowerCase().includes(materialLower)) {
          score = 1.0
        }
      } else {
        const materialWords = materialLower.split(/\s+/).filter(word => word.length > 2)
        const matchedWords = materialWords.filter(word =>
          item.keywords.some(keyword => keyword.includes(word) || word.includes(keyword)) ||
          item.descricaoItem.toLowerCase().includes(word)
        )

        if (materialWords.length > 0) {
          score = matchedWords.length / materialWords.length

          if (item.descricaoItem.toLowerCase().includes(materialLower)) {
            score += 0.3
          }

          score = Math.min(score, 1.0)
        }
      }

      if (score > bestMatch.score) {
        bestMatch = {
          code: item.codigoItem,
          description: item.descricaoItem,
          score: Math.round(score * 100) / 100
        }
      }
    }

    return bestMatch
  }
}
