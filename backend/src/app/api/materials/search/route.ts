import { NextRequest, NextResponse } from 'next/server'
import { enhancedMatchingService } from '@/lib/matching/enhanced-matching-service'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema de validação para busca simples
const searchSchema = z.object({
  query: z.string().min(1, 'Query é obrigatória'),
  limit: z.number().min(1).max(100).optional().default(50),
})

// GET /api/materials/search - Buscar materiais usando o novo motor
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const validation = searchSchema.safeParse({
      query: searchParams.get('query') || '',
      limit: parseInt(searchParams.get('limit') || '50')
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { query, limit } = validation.data

    // Buscar usando o novo EnhancedMatchingService (DB-First e Matrizes Matemáticas)
    // Usamos performMatching com threshold baixo para busca exploratória
    const result = await enhancedMatchingService.performMatching(query, 'FUZZY', 0.1);

    // Como o performMatching retorna apenas o melhor resultado, 
    // e esta rota GET espera uma lista, vamos buscar candidatos diretamente no banco
    // para manter a compatibilidade com a UI que espera uma lista.
    const materials = await prisma.catmatMaterial.findMany({
      where: {
        statusItem: true,
        OR: [
          { descricaoItem: { contains: query, mode: 'insensitive' } },
          { codigoItem: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: limit
    });

    const formattedMaterials = materials.map(material => ({
      id: material.id,
      code: material.codigoItem,
      name: material.descricaoItem,
      unit: material.unit,
      category: material.Categoria || 'N/A',
      subcategory: material.Subcategoria || 'N/A',
      keywords: material.keywords
    }))

    return NextResponse.json({
      materials: formattedMaterials,
      query,
      total: formattedMaterials.length,
      limit
    })

  } catch (error) {
    console.error('Erro na busca de materiais:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/materials/search - Busca avançada com filtros (Refatorado para CatmatMaterial)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const advSearchSchema = z.object({
      query: z.string().min(1),
      filters: z.object({
        categories: z.array(z.string()).optional(),
        units: z.array(z.string()).optional(),
      }).optional(),
      pagination: z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50)
      }).optional()
    })

    const validation = advSearchSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { query, filters, pagination } = validation.data
    const page = pagination?.page || 1
    const limit = pagination?.limit || 50
    const offset = (page - 1) * limit

    // Construir query base
    let whereClause: any = {
      statusItem: true,
      OR: [
        { descricaoItem: { contains: query, mode: 'insensitive' } },
        { codigoItem: { contains: query, mode: 'insensitive' } },
        { keywords: { has: query } }
      ]
    }

    if (filters?.categories && filters.categories.length > 0) {
      whereClause.Categoria = { in: filters.categories }
    }

    if (filters?.units && filters.units.length > 0) {
      whereClause.unit = { in: filters.units }
    }

    const [materials, total] = await Promise.all([
      prisma.catmatMaterial.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy: { descricaoItem: 'asc' }
      }),
      prisma.catmatMaterial.count({ where: whereClause })
    ])

    const formattedMaterials = materials.map(material => ({
      id: material.id,
      code: material.codigoItem,
      name: material.descricaoItem,
      unit: material.unit,
      category: material.Categoria || 'N/A',
      subcategory: material.Subcategoria || 'N/A',
      keywords: material.keywords
    }))

    return NextResponse.json({
      materials: formattedMaterials,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      query,
      filters: filters || {}
    })

  } catch (error) {
    console.error('Erro na busca avançada:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}