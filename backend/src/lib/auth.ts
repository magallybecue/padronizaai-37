import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key')

// Interfaces
export interface User {
  id: string
  email: string
  name: string | null
  plan: 'FREE' | 'PRO' | 'ENTERPRISE'
  createdAt: Date
}

export interface AuthenticatedRequest extends NextRequest {
  user?: User
}

// Schemas de validação
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
})

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional()
})

// Gerar JWT token
export async function generateToken(user: User): Promise<string> {
  return await new SignJWT({
    userId: user.id,
    email: user.email,
    plan: user.plan
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET)
}

// Verificar JWT token
export async function verifyToken(token: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch (error) {
    throw new Error('Token inválido')
  }
}

// Middleware de autenticação
export async function authMiddleware(request: NextRequest): Promise<{ user: User | null, error: string | null }> {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader?.startsWith('Bearer ')) {
      return { user: null, error: 'Token de autenticação necessário' }
    }

    const token = authHeader.split(' ')[1]
    const payload = await verifyToken(token)

    // Buscar usuário no banco
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string }
    })

    if (!user) {
      return { user: null, error: 'Usuário não encontrado' }
    }

    return { 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        createdAt: user.createdAt
      }, 
      error: null 
    }

  } catch (error) {
    return { user: null, error: (error as Error).message }
  }
}

// Fazer login
export async function authenticateUser(email: string, password: string): Promise<{ user: User | null, token: string | null, error: string | null }> {
  try {
    // Buscar usuário por email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return { user: null, token: null, error: 'Credenciais inválidas' }
    }

    // Verificar senha (assumindo que temos um campo password no schema)
    // Nota: O schema atual não tem campo password, seria necessário adicionar
    // const isValidPassword = await bcrypt.compare(password, user.password)
    
    // Por enquanto, vamos simular autenticação básica
    const isValidPassword = true // TODO: Implementar verificação real

    if (!isValidPassword) {
      return { user: null, token: null, error: 'Credenciais inválidas' }
    }

    // Registrar log de login
    await prisma.userLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        details: 'Login via API',
        ipAddress: null, // TODO: Extrair IP do request
        userAgent: null  // TODO: Extrair User-Agent do request
      }
    })

    // Gerar token
    const userData: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      createdAt: user.createdAt
    }

    const token = await generateToken(userData)

    return { user: userData, token, error: null }

  } catch (error) {
    return { user: null, token: null, error: (error as Error).message }
  }
}

// Registrar usuário
export async function registerUser(email: string, password: string, name?: string): Promise<{ user: User | null, token: string | null, error: string | null }> {
  try {
    // Verificar se usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return { user: null, token: null, error: 'Email já está em uso' }
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12)

    // Criar usuário
    // Nota: Seria necessário adicionar campo password no schema
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        plan: 'FREE'
        // password: hashedPassword // TODO: Adicionar no schema
      }
    })

    // Registrar log
    await prisma.userLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        details: 'Registro de nova conta'
      }
    })

    const userData: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      createdAt: user.createdAt
    }

    const token = await generateToken(userData)

    return { user: userData, token, error: null }

  } catch (error) {
    return { user: null, token: null, error: (error as Error).message }
  }
}

// Verificar limites do usuário
export async function checkUserLimits(user: User): Promise<{ canUpload: boolean, reason?: string }> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const uploadsToday = await prisma.upload.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: today
        }
      }
    })

    // Verificar limites por plano
    let dailyLimit: number
    let itemLimit: number

    switch (user.plan) {
      case 'FREE':
        dailyLimit = 5
        itemLimit = 1000
        break
      case 'PRO':
        dailyLimit = Infinity
        itemLimit = 10000
        break
      case 'ENTERPRISE':
        dailyLimit = Infinity
        itemLimit = Infinity
        break
      default:
        dailyLimit = 5
        itemLimit = 1000
    }

    if (uploadsToday >= dailyLimit) {
      return { 
        canUpload: false, 
        reason: `Limite diário de ${dailyLimit} uploads atingido` 
      }
    }

    return { canUpload: true }

  } catch (error) {
    console.error('Erro ao verificar limites:', error)
    return { canUpload: false, reason: 'Erro interno' }
  }
}

// Middleware para rotas protegidas
export function createAuthMiddleware(requiredPlan?: 'FREE' | 'PRO' | 'ENTERPRISE') {
  return async (request: NextRequest) => {
    const { user, error } = await authMiddleware(request)

    if (error || !user) {
      return NextResponse.json(
        { error: error || 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar plano se necessário
    if (requiredPlan) {
      const planLevels = { FREE: 0, PRO: 1, ENTERPRISE: 2 }
      const userLevel = planLevels[user.plan]
      const requiredLevel = planLevels[requiredPlan]

      if (userLevel < requiredLevel) {
        return NextResponse.json(
          { error: `Plano ${requiredPlan} necessário` },
          { status: 403 }
        )
      }
    }

    // Adicionar user ao request
    (request as AuthenticatedRequest).user = user

    return null // Continue with the request
  }
}

// Rate limiting simples
const rateLimitMap = new Map<string, { count: number, resetTime: number }>()

export function rateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(identifier)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    })
    return true
  }

  if (userLimit.count >= maxRequests) {
    return false
  }

  userLimit.count++
  return true
}

// Limpar rate limits antigos
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 60000) // Limpar a cada minuto