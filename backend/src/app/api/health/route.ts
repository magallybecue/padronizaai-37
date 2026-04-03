// backend/src/app/api/health/route.ts
import { NextResponse } from 'next/server';

// CORS handled by middleware.ts

// GET - Health check
export async function GET() {
  try {
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'CATMAT Align API',
      version: '1.0.0',
      database: 'connected',
      materials: '326.195 loaded'
    };

    console.log('✅ Health check requested:', healthData);
    
    // Return in ApiResponse format
    return NextResponse.json({
      success: true,
      data: healthData
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        data: null
      }, 
      { status: 500 }
    );
  }
}