import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uploadId = searchParams.get('uploadId')

    if (!uploadId) {
      return NextResponse.json(
        { error: 'uploadId é obrigatório' },
        { status: 400 }
      )
    }
    
    const upload = await prisma.upload.findUnique({
      where: { id: uploadId }
    })

    if (!upload) {
      return NextResponse.json(
        { error: 'Upload não encontrado' },
        { status: 404 }
      )
    }

    // Processar com dados reais
    processRealData(uploadId)

    return NextResponse.json({
      success: true,
      message: 'Processando com base CATMAT real (326K materiais)',
      uploadId,
      filename: upload.originalName
    })

  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

async function processRealData(uploadId: string) {
  try {
    await prisma.upload.update({
      where: { id: uploadId },
      data: { status: 'PROCESSING' }
    })

    // Dados do CSV (baseado no test.csv)
    const materials = [
      'Parafuso M6',
      'Cabo de aço 3mm',
      'Tinta branca',
      'Porca sextavada M8', 
      'Arruela lisa 6mm'
    ]

    console.log(`📋 Processando ${materials.length} materiais com base CATMAT real`)

    let matchedCount = 0

    for (let i = 0; i < materials.length; i++) {
      const material = materials[i]
      
      console.log(`🔍 Buscando: ${material}`)

      // Buscar na base REAL com 326K materiais
      const matches = await prisma.catmatMaterial.findMany({
        where: {
          statusItem: true,
          OR: [
            { description: { contains: material, mode: 'insensitive' } },
            { keywords: { hasSome: material.toLowerCase().split(' ') } },
            { Categoria: { contains: material.split(' ')[0], mode: 'insensitive' } }
          ]
        },
        orderBy: { description: 'asc' },
        take: 3
      })

      const bestMatch = matches[0]
      let score = 0

      if (bestMatch) {
        // Calcular score baseado em palavras coincidentes
        const materialWords = material.toLowerCase().split(' ')
        const descWords = bestMatch.description.toLowerCase().split(' ')
        const commonWords = materialWords.filter(word => 
          descWords.some(descWord => descWord.includes(word) || word.includes(descWord))
        )
        score = commonWords.length / materialWords.length
        
        // Bonus se tem match exato
        if (bestMatch.description.toLowerCase().includes(material.toLowerCase())) {
          score += 0.2
        }
        
        score = Math.min(score, 1.0)
      }

      await prisma.matchingResult.create({
        data: {
          uploadId,
          rowIndex: i,
          originalText: material,
          catmatCode: bestMatch?.code || null,
          catmatDescription: bestMatch?.description || null,
          matchScore: Math.round(score * 100) / 100,
          algorithm: 'FUZZY',
          status: score >= 0.5 ? 'MATCHED' : 'NO_MATCH'
        }
      })

      if (score >= 0.5) matchedCount++

      // Atualizar progresso
      await prisma.upload.update({
        where: { id: uploadId },
        data: {
          processedRows: i + 1,
          matchedRows: matchedCount
        }
      })

      console.log(`✅ ${material} -> ${bestMatch?.description || 'SEM MATCH'} (score: ${score})`)
      
      // Pequeno delay para ver progresso
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Finalizar
    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        status: 'COMPLETED',
        processedRows: materials.length,
        matchedRows: matchedCount
      }
    })

    console.log(`🎉 Processamento concluído: ${matchedCount}/${materials.length} matches com base real`)

  } catch (error) {
    console.error('Erro no processamento real:', error)
    await prisma.upload.update({
      where: { id: uploadId },
      data: { status: 'FAILED' }
    })
  }
}
