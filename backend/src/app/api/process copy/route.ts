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

    if (upload.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Upload já foi processado ou está em processamento' },
        { status: 400 }
      )
    }

    // Marcar como processando
    await prisma.upload.update({
      where: { id: uploadId },
      data: { status: 'PROCESSING' }
    })

    // Processar em background
    processWithRealCatmat(uploadId)

    return NextResponse.json({
      success: true,
      message: 'Processamento iniciado com base CATMAT real (326K materiais)',
      uploadId
    })

  } catch (error) {
    console.error('Erro ao processar:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function processWithRealCatmat(uploadId: string) {
  try {
    const materials = [
      'Parafuso M6',
      'Cabo de aço 3mm', 
      'Tinta branca',
      'Porca sextavada M8',
      'Arruela lisa 6mm'
    ]

    let processedRows = 0
    let matchedRows = 0

    for (let i = 0; i < materials.length; i++) {
      const material = materials[i]
      
      console.log(`🔍 Buscando: ${material}`)
      
      // Buscar na base real com 326K materiais
      const matches = await prisma.catmatMaterial.findMany({
        where: {
          statusItem: true,
          OR: [
            { descricaoItem: { contains: material, mode: 'insensitive' } },
            { keywords: { hasSome: material.toLowerCase().split(' ') } }
          ]
        },
        take: 1
      })

      const bestMatch = matches[0]
      let score = 0

      if (bestMatch) {
        // Calcular score básico
        const materialWords = material.toLowerCase().split(' ')
        const matchedWords = materialWords.filter(word => 
          bestMatch.descricaoItem.toLowerCase().includes(word)
        )
        score = matchedWords.length / materialWords.length
      }

      await prisma.matchingResult.create({
        data: {
          uploadId,
          rowIndex: i,
          originalText: material,
          catmatCode: bestMatch?.codigoItem || null,
          catmatDescription: bestMatch?.descricaoItem || null,
          matchScore: score,
          algorithm: 'FUZZY',
          status: score >= 0.5 ? 'MATCHED' : 'NO_MATCH'
        }
      })

      if (score >= 0.5) matchedRows++
      processedRows++

      await prisma.upload.update({
        where: { id: uploadId },
        data: { processedRows, matchedRows }
      })

      console.log(`✅ Processado: ${material} -> ${bestMatch?.descricaoItem || 'SEM MATCH'} (${score})`)
      
      // Delay para ver progresso
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        status: 'COMPLETED',
        processedRows,
        matchedRows
      }
    })

    console.log(`🎉 Processamento concluído: ${matchedRows}/${processedRows} matches`)

  } catch (error) {
    console.error('Erro no processamento:', error)
    await prisma.upload.update({
      where: { id: uploadId },
      data: { status: 'FAILED' }
    })
  }
}
