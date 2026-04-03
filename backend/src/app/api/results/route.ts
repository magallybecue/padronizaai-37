import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uploadId = searchParams.get('uploadId')

    if (!uploadId) {
      return NextResponse.json(
        { error: 'Parâmetro uploadId é obrigatório' },
        { status: 400 }
      )
    }

    const results = await prisma.matchingResult.findMany({
      where: { uploadId },
      orderBy: { rowIndex: 'asc' }
    })

    return NextResponse.json({
      uploadId,
      totalResults: results.length,
      results: results.map(result => ({
        originalText: result.originalText,
        catmatCode: result.catmatCode,
        catmatDescription: result.catmatDescription,
        matchScore: result.matchScore,
        status: result.status
      }))
    })

  } catch (error) {
    console.error('Erro ao buscar resultados:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
