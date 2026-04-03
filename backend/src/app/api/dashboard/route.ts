import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get total uploads
    const totalUploads = await prisma.upload.count();

    // Get completed uploads
    const completedUploads = await prisma.upload.count({
      where: { status: 'COMPLETED' }
    });

    // Get total processed items
    const processedItemsResult = await prisma.upload.aggregate({
      where: { status: 'COMPLETED' },
      _sum: {
        processedRows: true,
        matchedRows: true,
        errorRows: true
      }
    });

    // Calculate match rate
    const totalProcessed = processedItemsResult._sum.processedRows || 0;
    const totalMatched = processedItemsResult._sum.matchedRows || 0;
    const matchRate = totalProcessed > 0 ? (totalMatched / totalProcessed) * 100 : 0;

    // Get recent uploads (last 5)
    const recentUploads = await prisma.upload.findMany({
      select: {
        id: true,
        filename: true,
        originalName: true,
        status: true,
        totalRows: true,
        processedRows: true,
        matchedRows: true,
        errorRows: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Get processing uploads count
    const processingUploads = await prisma.upload.count({
      where: { status: 'PROCESSING' }
    });

    const stats = {
      totalUploads,
      completedUploads,
      processingUploads,
      totalItemsProcessed: totalProcessed,
      totalItemsMatched: totalMatched,
      totalItemsWithErrors: processedItemsResult._sum.errorRows || 0,
      matchRate: Math.round(matchRate * 10) / 10, // Round to 1 decimal
      recentUploads: recentUploads.map(upload => ({
        ...upload,
        matchRate: upload.processedRows > 0 
          ? Math.round((upload.matchedRows / upload.processedRows) * 100 * 10) / 10 
          : 0
      }))
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}