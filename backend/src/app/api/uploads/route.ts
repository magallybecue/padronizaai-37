// backend/src/app/api/uploads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Handle CORS preflight requests - middleware handles CORS headers
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    // Remove manual CORS headers - middleware will handle them
  });
}

// GET - Listar uploads
export async function GET() {
  try {
    console.log('📋 GET /api/uploads - Fetching uploads from database');
    
    const uploads = await prisma.upload.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50 // Últimos 50 uploads
    });

    console.log(`✅ Found ${uploads.length} uploads`);
    
    return NextResponse.json({
      success: true,
      data: uploads
    });
    // Middleware handles CORS headers
  } catch (error) {
    console.error('❌ Error fetching uploads:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch uploads',
        data: null
      },
      { status: 500 }
      // Middleware handles CORS headers
    );
  }
}

// POST - Upload de arquivo
export async function POST(request: NextRequest) {
  try {
    console.log('📤 POST /api/uploads - Received upload request');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const algorithm = formData.get('algorithm') as string || 'FUZZY';
    const threshold = parseFloat(formData.get('threshold') as string) || 0.8;

    if (!file) {
      console.log('❌ No file provided');
      return NextResponse.json(
        { 
          success: false,
          error: 'No file provided',
          data: null
        },
        { status: 400 }
        // Middleware handles CORS headers
      );
    }

    console.log('📁 File received:', {
      name: file.name,
      size: file.size,
      type: file.type,
      algorithm,
      threshold
    });

    // Processar arquivo baseado no tipo
    let materials: string[] = [];
    let actualRows = 0;

    if (file.type.includes('excel') || file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // Processar arquivo Excel
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      console.log(`📊 Excel file processed: ${data.length} rows found`);
      
      // Extrair materiais da primeira coluna (pulando cabeçalhos se houver)
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row && row[0] && typeof row[0] === 'string' && row[0].trim()) {
          // Pular possíveis cabeçalhos
          const text = String(row[0]).trim();
          if (text && !text.toLowerCase().includes('material') && !text.toLowerCase().includes('descrição') && !text.toLowerCase().includes('item')) {
            materials.push(text);
          }
        }
      }
      actualRows = materials.length;
    } else {
      // Processar arquivo CSV/texto
      const rawContent = await file.text();
      const fileContent = rawContent
        .replace(/\0/g, '') // Remove caracteres nulos
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove outros caracteres de controle
        .trim();
      const lines = fileContent.split('\n').filter(line => line.trim() !== '');
      
      // Para CSV, assumir primeira coluna
      for (const line of lines) {
        const columns = line.split(',');
        if (columns[0] && columns[0].trim()) {
          const text = columns[0].replace(/"/g, '').trim();
          if (text && !text.toLowerCase().includes('material') && !text.toLowerCase().includes('descrição')) {
            materials.push(text);
          }
        }
      }
      actualRows = materials.length;
    }

    console.log(`📝 Extracted ${actualRows} materials from file`);
    
    // Salvar upload no banco de dados
    const upload = await prisma.upload.create({
      data: {
        filename: file.name,
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        status: 'PENDING',
        algorithm: algorithm as any, // Cast para o enum
        threshold: threshold,
        totalRows: Math.max(1, Math.min(actualRows, 10000)), // Entre 1 e 10.000
        // userId: 'temp-user' // Por enquanto, removemos userId até criar um sistema de auth
      }
    });

    // Salvar materiais processados como JSON no fileContent
    const materialsData = JSON.stringify({ 
      materials: materials.slice(0, 10000), // Limitar a 10k itens
      processedAt: new Date().toISOString(),
      originalFilename: file.name,
      fileType: file.type
    });

    await prisma.$executeRaw`
      UPDATE uploads 
      SET "fileContent" = ${materialsData} 
      WHERE id = ${upload.id}
    `;

    console.log('✅ Upload saved to database:', {
      id: upload.id,
      filename: upload.filename,
      size: upload.size,
      totalRows: upload.totalRows
    });
    
    return NextResponse.json({
      success: true,
      data: {
        id: upload.id,
        filename: upload.filename,
        status: upload.status,
        totalRows: upload.totalRows
      }
    }, {
      status: 201
      // Middleware handles CORS headers
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Upload failed: ' + errorMessage,
        data: null
      },
      { status: 500 }
      // Middleware handles CORS headers
    );
  }
}