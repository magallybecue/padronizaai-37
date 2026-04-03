import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}

/**
 * GET /api/uploads/[id]
 * Busca detalhes de um upload específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`📋 Fetching upload details: ${id}`);

    // Busca o upload no banco de dados
    const upload = await prisma.upload.findUnique({
      where: {
        id: id
      }
    });

    if (!upload) {
      console.log(`❌ Upload not found: ${id}`);
      return NextResponse.json(
        { error: 'Upload not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Upload found: ${upload.filename} - Status: ${upload.status}`);

    // Retorna os detalhes do upload
    return NextResponse.json(upload);

  } catch (error) {
    console.error('❌ Error fetching upload details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}