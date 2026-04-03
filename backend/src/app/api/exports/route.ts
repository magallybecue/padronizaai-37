import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/auth'
import * as XLSX from 'xlsx'
import { z } from 'zod'

// Schema de validação
const exportSchema = z.object({
  uploadId: z.string().uuid('Upload ID inválido'),
  format: z.enum(['csv', 'xlsx'], { message: 'Formato deve ser csv ou xlsx' }),
  includeColumns: z.object({
    originalName: z.boolean().default(true),
    standardizedName: z.boolean().default(true),
    catmatCode: z.boolean().default(true),
    category: z.boolean().default(true),
    subcategory: z.boolean().default(false),
    confidenceScore: z.boolean().default(true),
    status: z.boolean().default(true),
    quantity: z.boolean().default(false),
    unit: z.boolean().default(false)
  }).default({}),
  filters: z.object({
    status: z.array(z.enum(['PENDING', 'APPROVED', 'REJECTED', 'NOT_FOUND', 'MANUAL'])).optional(),
    minConfidence: z.number().min(0).max(100).optional(),
    maxConfidence: z.number().min(0).max(100).optional()
  }).optional()
})

// POST /api/exports - Exportar resultados
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const { user, error } = await authMiddleware(request)
    
    if (error || !user) {
      return NextResponse.json(
        { error: error || 'Não autorizado' },
        { status: 401 }
      )
    }

    // Validar dados de entrada
    const body = await request.json()
    const validation = exportSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { uploadId, format, includeColumns, filters } = validation.data

    // Verificar se o upload pertence ao usuário
    const upload = await prisma.upload.findFirst({
      where: {
        id: uploadId,
        // userId: user.id  // Removido temporariamente até implementar sistema de auth
      }
    })

    if (!upload) {
      return NextResponse.json(
        { error: 'Upload não encontrado' },
        { status: 404 }
      )
    }

    // Construir query para buscar dados
    let whereClause: any = {
      uploadId: uploadId
    }

    // Aplicar filtros
    if (filters?.status && filters.status.length > 0) {
      whereClause.status = { in: filters.status }
    }

    if (filters?.minConfidence !== undefined) {
      whereClause.confidenceScore = { 
        ...whereClause.confidenceScore,
        gte: filters.minConfidence 
      }
    }

    if (filters?.maxConfidence !== undefined) {
      whereClause.confidenceScore = { 
        ...whereClause.confidenceScore,
        lte: filters.maxConfidence 
      }
    }

    // Buscar dados para exportação
    const matchedItems = await prisma.matchedItem.findMany({
      where: whereClause,
      include: {
        uploadItem: true,
        material: {
          include: {
            category: { select: { name: true, code: true } },
            subcategory: { select: { name: true, code: true } }
          }
        }
      },
      orderBy: {
        uploadItem: { rowNumber: 'asc' }
      }
    })

    if (matchedItems.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum item encontrado para exportação' },
        { status: 404 }
      )
    }

    // Preparar dados para exportação
    const exportData = matchedItems.map(item => {
      const row: any = {}

      if (includeColumns.originalName) {
        row['Material Original'] = item.originalText
      }

      if (includeColumns.standardizedName) {
        row['Material Padronizado'] = item.matchedText || 'Não encontrado'
      }

      if (includeColumns.catmatCode) {
        row['Código CATMAT'] = item.material?.code || 'N/A'
      }

      if (includeColumns.category) {
        row['Categoria'] = item.material?.category?.name || 'N/A'
      }

      if (includeColumns.subcategory) {
        row['Subcategoria'] = item.material?.subcategory?.name || 'N/A'
      }

      if (includeColumns.confidenceScore) {
        row['Score de Confiança'] = `${item.confidenceScore.toFixed(1)}%`
      }

      if (includeColumns.status) {
        row['Status'] = translateStatus(item.status)
      }

      if (includeColumns.quantity && item.uploadItem.quantity) {
        row['Quantidade'] = item.uploadItem.quantity
      }

      if (includeColumns.unit) {
        row['Unidade'] = item.uploadItem.unit || item.material?.unit || 'N/A'
      }

      return row
    })

    // Gerar arquivo baseado no formato
    let fileBuffer: Buffer
    let fileName: string
    let mimeType: string

    if (format === 'csv') {
      const csvContent = generateCSV(exportData)
      fileBuffer = Buffer.from(csvContent, 'utf-8')
      fileName = `catmat-export-${upload.originalName}-${Date.now()}.csv`
      mimeType = 'text/csv'
    } else {
      fileBuffer = generateXLSX(exportData, upload.originalName)
      fileName = `catmat-export-${upload.originalName}-${Date.now()}.xlsx`
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }

    // Registrar log de download
    await prisma.userLog.create({
      data: {
        // userId: user.id  // Removido temporariamente até implementar sistema de auth,
        action: 'DOWNLOAD_RESULT',
        details: `Export ${format.toUpperCase()} - ${matchedItems.length} items`
      }
    })

    // Retornar arquivo
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('Erro na exportação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET /api/exports/preview - Preview dos dados de exportação
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authMiddleware(request)
    
    if (error || !user) {
      return NextResponse.json(
        { error: error || 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const uploadId = searchParams.get('uploadId')

    if (!uploadId) {
      return NextResponse.json(
        { error: 'Upload ID é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o upload pertence ao usuário
    const upload = await prisma.upload.findFirst({
      where: {
        id: uploadId,
        // userId: user.id  // Removido temporariamente até implementar sistema de auth
      }
    })

    if (!upload) {
      return NextResponse.json(
        { error: 'Upload não encontrado' },
        { status: 404 }
      )
    }

    // Buscar estatísticas dos dados
    const stats = await prisma.matchedItem.groupBy({
      by: ['status'],
      where: { uploadId },
      _count: { status: true }
    })

    // Buscar sample dos dados
    const sampleItems = await prisma.matchedItem.findMany({
      where: { uploadId },
      include: {
        uploadItem: true,
        material: {
          include: {
            category: { select: { name: true } },
            subcategory: { select: { name: true } }
          }
        }
      },
      take: 10,
      orderBy: { uploadItem: { rowNumber: 'asc' } }
    })

    const preview = sampleItems.map(item => ({
      originalName: item.originalText,
      standardizedName: item.matchedText,
      catmatCode: item.material?.code,
      category: item.material?.category?.name,
      subcategory: item.material?.subcategory?.name,
      confidenceScore: item.confidenceScore,
      status: translateStatus(item.status),
      quantity: item.uploadItem.quantity,
      unit: item.uploadItem.unit || item.material?.unit
    }))

    return NextResponse.json({
      upload: {
        id: upload.id,
        fileName: upload.originalName,
        totalItems: upload.totalItems
      },
      statistics: stats.map(stat => ({
        status: translateStatus(stat.status),
        count: stat._count.status
      })),
      preview,
      availableColumns: [
        { key: 'originalName', label: 'Material Original', default: true },
        { key: 'standardizedName', label: 'Material Padronizado', default: true },
        { key: 'catmatCode', label: 'Código CATMAT', default: true },
        { key: 'category', label: 'Categoria', default: true },
        { key: 'subcategory', label: 'Subcategoria', default: false },
        { key: 'confidenceScore', label: 'Score de Confiança', default: true },
        { key: 'status', label: 'Status', default: true },
        { key: 'quantity', label: 'Quantidade', default: false },
        { key: 'unit', label: 'Unidade', default: false }
      ]
    })

  } catch (error) {
    console.error('Erro no preview:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Funções auxiliares
function generateCSV(data: any[]): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Escape CSV values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
  ]

  return csvRows.join('\n')
}

function generateXLSX(data: any[], originalFileName: string): Buffer {
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Configurar largura das colunas
  const columnWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, 15)
  }))
  
  worksheet['!cols'] = columnWidths

  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Materiais Padronizados')

  // Adicionar sheet com metadados
  const metadata = {
    'Arquivo Original': originalFileName,
    'Data de Exportação': new Date().toLocaleString('pt-BR'),
    'Total de Itens': data.length
  }

  const metaWorksheet = XLSX.utils.json_to_sheet([metadata])
  XLSX.utils.book_append_sheet(workbook, metaWorksheet, 'Informações')

  // Gerar buffer
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'PENDING': 'Pendente',
    'APPROVED': 'Aprovado',
    'REJECTED': 'Rejeitado',
    'NOT_FOUND': 'Não Encontrado',
    'MANUAL': 'Manual'
  }

  return statusMap[status] || status
}