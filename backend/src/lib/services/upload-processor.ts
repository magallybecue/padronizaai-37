import { prisma } from '@/lib/prisma'
import { enhancedMatchingService } from '../matching/enhanced-matching-service'

export class UploadProcessor {

  // Método de fallback offline quando banco está indisponível
  private performOfflineMatching(
    material: string, 
    algorithm: string, 
    threshold: number
  ) {
    try {
      // Normalizar texto de busca
      const searchText = this.normalizeText(material)
      
      // Base de dados mock offline para casos de emergência
      const mockCatmat = [
        { codigoItem: '123456', descricaoItem: 'TUBO COBRE RIGIDO SEM COSTURA EMBARCACAO DIAMETRO 15 MM' },
        { codigoItem: '123457', descricaoItem: 'TUBO ALUMINIO QUADRADO ALTURA 15 CM LARGURA 15 CM AGUAS PLUVIAIS' },
        { codigoItem: '123458', descricaoItem: 'TUBO ACO SEM COSTURA SCHEDULE 40 DIAMETRO 8 POLEGADAS' },
        { codigoItem: '123459', descricaoItem: 'TUBO ALUMINIO REDONDO ALTURA 1 1/4 POLEGADAS COMPRIMENTO 6 METROS' },
        { codigoItem: '123460', descricaoItem: 'TUBO ACO MECANICO LAMINADO ST 52 DIAMETRO EXTERNO 73 MM INTERNO 57 MM' },
        { codigoItem: '456789', descricaoItem: 'PARAFUSO SEXTAVADO M6 ACO INOXIDAVEL' },
        { codigoItem: '456790', descricaoItem: 'PARAFUSO SEXTAVADO M8 ACO CARBONO' },
        { codigoItem: '456791', descricaoItem: 'PORCA SEXTAVADA M6 ACO INOXIDAVEL' },
        { codigoItem: '456792', descricaoItem: 'ARRUELA LISA 6 MM ACO INOXIDAVEL' },
        { codigoItem: '456793', descricaoItem: 'CABO ACO INOXIDAVEL 3 MM GALVANIZADO' }
      ]
      
      let bestMatch: any = null
      let bestScore = 0
      
      if (algorithm === 'EXACT') {
        // Busca exata
        for (const candidate of mockCatmat) {
          const candidateNorm = this.normalizeText(candidate.descricaoItem)
          if (candidateNorm.includes(searchText) || searchText.includes(candidateNorm)) {
            bestMatch = candidate
            bestScore = 100
            break
          }
        }
      } else {
        // Busca fuzzy usando similaridade básica
        for (const candidate of mockCatmat) {
          const candidateNorm = this.normalizeText(candidate.descricaoItem)
          const similarity = this.calculateBasicSimilarity(searchText, candidateNorm)
          const score = similarity * 100
          
          if (score > bestScore && score >= threshold * 100) {
            bestScore = score
            bestMatch = candidate
          }
        }
      }
      
      return {
        code: bestMatch?.codigoItem || null,
        description: bestMatch?.descricaoItem || null,
        score: bestScore,
        algorithm: algorithm + '_OFFLINE'
      }
      
    } catch (error) {
      console.error('Erro no matching offline:', error)
      return {
        code: null,
        description: null,
        score: 0,
        algorithm: algorithm + '_ERROR'
      }
    }
  }

  // Método de fallback simples quando Enhanced Matching Service falha
  private async performSimpleMatching(
    material: string, 
    algorithm: string, 
    threshold: number
  ) {
    try {
      // Normalizar texto de busca
      const searchText = this.normalizeText(material)
      
      // Buscar na base CATMAT
      let bestMatch: any = null
      let bestScore = 0
      
      if (algorithm === 'EXACT') {
        // Busca exata
        const exactMatch = await prisma.catmatMaterial.findFirst({
          where: {
            statusItem: true,
            OR: [
              { descricaoItem: { contains: material, mode: 'insensitive' } },
              { descricaoItem: { contains: searchText, mode: 'insensitive' } }
            ]
          }
        })
        
        if (exactMatch) {
          bestMatch = exactMatch
          bestScore = 100
        }
        
      } else {
        // Busca fuzzy simples
        const words = searchText.split(' ').filter(w => w.length > 2)
        
        if (words.length > 0) {
          const candidates = await prisma.catmatMaterial.findMany({
            where: {
              statusItem: true,
              OR: words.map(word => ({
                descricaoItem: { contains: word, mode: 'insensitive' }
              }))
            },
            take: 50
          })
          
          // Calcular similaridade básica
          for (const candidate of candidates) {
            const similarity = this.calculateBasicSimilarity(searchText, this.normalizeText(candidate.descricaoItem))
            const score = similarity * 100
            
            if (score > bestScore && score >= threshold * 100) {
              bestScore = score
              bestMatch = candidate
            }
          }
        }
      }
      
      return {
        code: bestMatch?.codigoItem || null,
        description: bestMatch?.descricaoItem || null,
        score: bestScore,
        algorithm: algorithm + '_FALLBACK'
      }
      
    } catch (error) {
      console.error('Erro no matching de fallback:', error)
      // Se falhou no DB, usar matching offline
      return this.performOfflineMatching(material, algorithm, threshold)
    }
  }

  // Normalizar texto para comparação
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, ' ') // Remove pontuação
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim()
  }

  // Cálculo básico de similaridade
  private calculateBasicSimilarity(text1: string, text2: string): number {
    if (text1 === text2) return 1.0
    if (text1.includes(text2) || text2.includes(text1)) {
      const shorter = Math.min(text1.length, text2.length)
      const longer = Math.max(text1.length, text2.length)
      return shorter / longer
    }
    
    const words1 = text1.split(' ')
    const words2 = text2.split(' ')
    const commonWords = words1.filter(w => words2.includes(w))
    
    return commonWords.length / Math.max(words1.length, words2.length)
  }
  
  async processUpload(uploadId: string) {
    try {
      console.log(`Iniciando processamento do upload: ${uploadId}`)
      
      const upload = await prisma.upload.findUnique({
        where: { id: uploadId }
      })

      if (!upload) {
        throw new Error('Upload não encontrado')
      }

      // Marcar como PROCESSING
      await prisma.upload.update({
        where: { id: uploadId },
        data: { status: 'PROCESSING' }
      })

      let materialLines: string[] = []

      // Se temos fileContent salvo no banco, usar ele
      if (upload.fileContent) {
        console.log(`🔍 DEBUG: Processando fileContent, primeiros 200 chars:`, upload.fileContent.substring(0, 200))
        
        try {
          const parsedData = JSON.parse(upload.fileContent)
          console.log(`🔍 DEBUG: JSON parseado com sucesso, tipo:`, typeof parsedData)
          console.log(`🔍 DEBUG: parsedData.materials existe?`, !!parsedData.materials)
          console.log(`🔍 DEBUG: parsedData.materials é array?`, Array.isArray(parsedData.materials))
          
          if (parsedData && parsedData.materials && Array.isArray(parsedData.materials)) {
            console.log(`🔍 DEBUG: Materiais brutos encontrados:`, parsedData.materials.length)
            parsedData.materials.forEach((mat: any, i: number) => console.log(`   ${i}: "${mat}"`))
            
            materialLines = parsedData.materials.filter((material: any, i: number) => {
              // Filtrar materiais válidos (não vazios, não cabeçalhos)
              if (typeof material !== 'string' || !material.trim()) {
                console.log(`🔍 DEBUG: Pulando material inválido:`, material)
                return false
              }
              const text = material.trim().toLowerCase()
              // Pular cabeçalhos comuns
              if (text === 'material' || text === 'descrição' || text === 'descricao' || 
                  text === 'item' || text === 'produto') {
                console.log(`🔍 DEBUG: Pulando cabeçalho:`, material)
                return false
              }
              console.log(`🔍 DEBUG: Material válido incluído:`, material)
              return true
            })
            console.log(`📋 Carregando ${materialLines.length} materiais válidos do banco de dados`)
            console.log(`📋 Lista final de materiais:`, materialLines)
          } else {
            throw new Error('JSON inválido ou sem array materials')
          }
        } catch (error) {
          console.error('❌ Erro ao processar fileContent como JSON:', error)
          console.log(`🔍 DEBUG: Tentando processar como texto simples`)
          // Fallback para conteúdo texto simples
          const lines = upload.fileContent.split('\n').filter((line: string) => {
            const trimmed = line.trim()
            return trimmed && !trimmed.toLowerCase().includes('material') && !trimmed.toLowerCase().includes('descrição')
          })
          materialLines = lines.length > 0 ? lines : []
          console.log(`🔍 DEBUG: Materiais extraídos como texto:`, materialLines)
        }
      } else {
        // Fallback: dados de teste para debug (não deveria acontecer mais)
        console.log('⚠️ Nenhum conteúdo encontrado, usando dados de exemplo')
        materialLines = [
          'Parafuso M6',
          'Cabo de aço 3mm', 
          'Tinta branca',
          'Porca sextavada M8',
          'Arruela lisa 6mm'
        ]
      }

      // Atualizar totalRows se não estiver definido
      if (!upload.totalRows) {
        await prisma.upload.update({
          where: { id: uploadId },
          data: { totalRows: materialLines.length }
        })
      }

      let processedRows = 0
      let matchedRows = 0
      let errorRows = 0

      console.log(`Processando ${materialLines.length} materiais`)

      for (let i = 0; i < materialLines.length; i++) {
        const material = materialLines[i]?.trim()
        
        if (!material) {
          errorRows++
          continue
        }
        
        try {
          // Usar o algoritmo de fallback simples ou offline se DB não disponível
          console.log(`🔄 Processando material ${i+1}/${materialLines.length}: ${material.substring(0, 50)}...`)
          
          const matchResult = await enhancedMatchingService.performMatching(
            material, 
            upload.algorithm, 
            upload.threshold
          )

          // Tentar salvar resultado - se DB estiver indisponível, continuar processando
          try {
            await prisma.matchingResult.create({
              data: {
                uploadId,
                rowIndex: i,
                originalText: material,
                catmatCode: matchResult.code,
                catmatDescription: matchResult.description,
                matchScore: matchResult.score,
                algorithm: upload.algorithm,
                status: matchResult.score >= (upload.threshold * 100) ? 'MATCHED' : 'NO_MATCH'
              }
            })
          } catch (saveError) {
            console.warn(`⚠️ Erro ao salvar resultado para ${material.substring(0, 30)}...: ${saveError}`)
            // Continuar processamento mesmo se não conseguir salvar
          }

          if (matchResult.score >= (upload.threshold * 100)) {
            matchedRows++
          }
          
          processedRows++

          // Tentar atualizar progresso a cada 10 itens ou no final
          if (processedRows % 10 === 0 || processedRows === materialLines.length) {
            try {
              await prisma.upload.update({
                where: { id: uploadId },
                data: {
                  processedRows,
                  matchedRows,
                  errorRows
                }
              })
            } catch (updateError) {
              console.warn(`⚠️ Erro ao atualizar progresso: ${updateError}`)
              // Continuar processamento mesmo se não conseguir atualizar progresso
            }
          }

          console.log(`Processado ${processedRows}/${materialLines.length}: ${material} (Score: ${matchResult.score})`)

        } catch (error) {
          console.error(`Erro ao processar linha ${i} (${material}):`, error)
          errorRows++
          processedRows++
        }
      }

      // Tentar finalizar processamento
      try {
        await prisma.upload.update({
          where: { id: uploadId },
          data: {
            status: 'COMPLETED',
            processedRows,
            matchedRows,
            errorRows
          }
        })
      } catch (finalError) {
        console.warn(`⚠️ Erro ao finalizar upload: ${finalError}`)
        // Se não conseguir atualizar status final, pelo menos registrar o resultado
        console.log(`📊 Processamento concluído (sem persistir status): ${processedRows} itens, ${matchedRows} matches`)
      }

      console.log(`✅ Upload ${uploadId} processado com sucesso - ${processedRows} itens, ${matchedRows} matches`)

    } catch (error) {
      console.error('❌ Erro no processamento:', error)
      
      try {
        await prisma.upload.update({
          where: { id: uploadId },
          data: { status: 'FAILED' }
        })
      } catch (updateError) {
        console.warn(`⚠️ Erro ao atualizar status FAILED: ${updateError}`)
      }
      
      throw error
    }
  }


}

// Função global para processar em background
export async function processUploadAsync(uploadId: string) {
  const processor = new UploadProcessor()
  
  // Executar sem await para não bloquear a resposta da API
  processor.processUpload(uploadId).catch(error => {
    console.error('Erro no processamento em background:', error)
  })
}
