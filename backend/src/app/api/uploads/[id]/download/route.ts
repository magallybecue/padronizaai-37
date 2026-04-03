import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`📥 Download request for upload: ${id}`);

    // Buscar o upload
    const upload = await prisma.upload.findUnique({
      where: { id },
      include: {
        results: {
          orderBy: { rowIndex: 'asc' }
        }
      }
    });

    console.log(`🔍 Upload found:`, upload ? 'YES' : 'NO');
    if (upload) {
      console.log(`📄 Upload details:`, {
        id: upload.id,
        status: upload.status,
        totalRows: upload.totalRows,
        processedRows: upload.processedRows,
        resultsCount: upload.results?.length || 0
      });
      console.log(`📊 First few results:`, upload.results?.slice(0, 3));
    }

    if (!upload) {
      return NextResponse.json(
        { error: 'Upload not found' },
        { status: 404 }
      );
    }

    if (upload.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Upload not completed yet' },
        { status: 400 }
      );
    }

    console.log(`📊 Found ${upload.results.length} results for download`);

    // Preparar dados para CSV com BOM UTF-8 para acentuação brasileira
    const csvHeader = 'Linha,Texto Original,Código CATMAT,Descrição CATMAT,Score,Status\n';
    
    const csvRows = upload.results.map(result => {
      return [
        result.rowIndex,
        `"${result.originalText.replace(/"/g, '""')}"`, // Escape quotes
        result.catmatCode || '',
        `"${result.catmatDescription?.replace(/"/g, '""') || ''}"`,
        result.matchScore?.toFixed(2) || '',
        result.status
      ].join(',');
    }).join('\n');

    // BOM UTF-8 para Excel e acentuação correta
    const BOM = '\uFEFF';
    const csvContent = BOM + csvHeader + csvRows;
    
    console.log(`📊 CSV content preview:`, csvContent.substring(0, 200));
    console.log(`📊 Total CSV length:`, csvContent.length);

    // Preparar headers para download
    const filename = `resultados_${upload.filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('❌ Download error:', error);
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    );
  }
}

// CORS preflight handled by middleware