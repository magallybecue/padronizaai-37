import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UploadProcessor } from "@/lib/services/upload-processor";

async function processUploadInBackground(uploadId: string) {
  console.log('🔥 Background process starting NOW for:', uploadId);
  
  try {
    const processor = new UploadProcessor();
    await processor.processUpload(uploadId);
    console.log('🎉 Background processing COMPLETED for:', uploadId);
  } catch (error) {
    console.error('💥 Background processing ERROR:', error);
    
    // Marcar como erro
    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        status: 'FAILED'
      }
    }).catch(console.error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🚀 POST /api/uploads/[id]/process called');
  console.log('📋 Upload ID:', params.id);

  try {
    const uploadId = params.id;

    // 1. Verificar se upload existe
    console.log('🔍 Step 1: Checking if upload exists...');
    const upload = await prisma.upload.findUnique({
      where: { id: uploadId }
    });

    if (!upload) {
      console.log('❌ Upload not found:', uploadId);
      return NextResponse.json(
        { error: 'Upload não encontrado' },
        { status: 404 }
      );
    }

    console.log('✅ Step 1: Upload found:', upload.filename);

    // 2. Verificar se já não está sendo processado
    console.log('🔍 Step 2: Checking upload status...');
    if (upload.status === 'PROCESSING') {
      console.log('⚠️ Upload already processing');
      return NextResponse.json(
        { error: 'Upload já está sendo processado' },
        { status: 400 }
      );
    }

    if (upload.status === 'COMPLETED') {
      console.log('⚠️ Upload already completed');
      return NextResponse.json(
        { error: 'Upload já foi processado' },
        { status: 400 }
      );
    }

    console.log('✅ Step 2: Status OK, current status:', upload.status);

    // 3. Atualizar status para PROCESSING
    console.log('🔍 Step 3: Updating status to PROCESSING...');
    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        status: 'PROCESSING',
        processedRows: 0,
        matchedRows: 0,
        errorRows: 0
      }
    });

    console.log('✅ Step 3: Upload status updated to PROCESSING:', uploadId);

    // 4. Iniciar processamento em background
    console.log('🚀 Step 4: About to start background processing...');
    
    // Usar apenas setImmediate para evitar processamento duplicado
    if (typeof setImmediate !== 'undefined') {
      console.log('🔧 Using setImmediate for background processing');
      setImmediate(() => {
        console.log('🔥 setImmediate callback executing...');
        processUploadInBackground(uploadId);
      });
    } 
    // Fallback para setTimeout apenas se setImmediate não estiver disponível
    else {
      console.log('🔧 Using setTimeout for background processing');
      setTimeout(() => {
        console.log('🔥 setTimeout callback executing...');
        processUploadInBackground(uploadId);
      }, 100);
    }

    console.log('✅ Step 4: Background processing scheduled');

    // 5. Responder imediatamente
    console.log('🔍 Step 5: Sending immediate response...');
    
    const response = {
      message: 'Processamento iniciado com sucesso',
      uploadId: uploadId,
      status: 'PROCESSING'
    };

    console.log('✅ Step 5: Response ready:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('💥 ERROR in process route:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}