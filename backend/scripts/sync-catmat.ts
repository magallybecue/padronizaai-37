import { prisma } from '../src/lib/prisma'
import { matchingService } from '../src/lib/matching/matching-service'
import axios from 'axios'
import { format } from 'date-fns'

interface CatmatMaterial {
  codigo: string
  descricao: string
  unidade_fornecimento?: string
  categoria?: {
    codigo: string
    nome: string
    descricao?: string
  }
  subcategoria?: {
    codigo: string
    nome: string
    descricao?: string
  }
  palavras_chave?: string[]
  ativo: boolean
}

interface CatmatResponse {
  materiais: CatmatMaterial[]
  total: number
  pagina: number
  por_pagina: number
}

class CatmatSyncService {
  private readonly API_BASE_URL = process.env.COMPRAS_GOV_API_URL || 'https://compras.dados.gov.br/materiais/v1'
  private readonly BATCH_SIZE = 1000
  private syncLogId: string | null = null

  async startSync(): Promise<void> {
    console.log(`🚀 Iniciando sincronização CATMAT - ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`)
    
    try {
      // Criar log de sincronização
      const syncLog = await prisma.syncLog.create({
        data: {
          status: 'RUNNING',
          startedAt: new Date()
        }
      })
      
      this.syncLogId = syncLog.id
      console.log(`📝 Log de sincronização criado: ${this.syncLogId}`)

      // Sincronizar categorias primeiro
      await this.syncCategories()
      
      // Sincronizar materiais
      await this.syncMaterials()
      
      // Atualizar cache do serviço de matching
      await matchingService.refreshMaterialsCache()
      
      // Marcar sincronização como concluída
      await this.completSync()
      
      console.log('✅ Sincronização CATMAT concluída com sucesso!')
      
    } catch (error) {
      console.error('❌ Erro na sincronização CATMAT:', error)
      await this.failSync(error as Error)
      throw error
    }
  }

  private async syncCategories(): Promise<void> {
    console.log('📂 Sincronizando categorias...')
    
    try {
      const response = await axios.get(`${this.API_BASE_URL}/categorias`, {
        timeout: 30000,
        headers: {
          'User-Agent': 'CATMAT-Align/1.0'
        }
      })

      const categories = response.data.categorias || []
      console.log(`📊 Encontradas ${categories.length} categorias`)

      let newCategories = 0
      let updatedCategories = 0

      for (const catData of categories) {
        const existingCategory = await prisma.category.findUnique({
          where: { code: catData.codigo }
        })

        if (existingCategory) {
          // Atualizar se necessário
          if (existingCategory.name !== catData.nome || 
              existingCategory.description !== catData.descricao) {
            await prisma.category.update({
              where: { id: existingCategory.id },
              data: {
                name: catData.nome,
                description: catData.descricao || null
              }
            })
            updatedCategories++
          }
        } else {
          // Criar nova categoria
          await prisma.category.create({
            data: {
              code: catData.codigo,
              name: catData.nome,
              description: catData.descricao || null
            }
          })
          newCategories++
        }

        // Sincronizar subcategorias se existirem
        if (catData.subcategorias && catData.subcategorias.length > 0) {
          await this.syncSubcategories(catData.codigo, catData.subcategorias)
        }
      }

      console.log(`✨ Categorias: ${newCategories} novas, ${updatedCategories} atualizadas`)
      
    } catch (error) {
      console.error('❌ Erro ao sincronizar categorias:', error)
      throw error
    }
  }

  private async syncSubcategories(categoryCode: string, subcategories: any[]): Promise<void> {
    const category = await prisma.category.findUnique({
      where: { code: categoryCode }
    })

    if (!category) {
      console.warn(`⚠️ Categoria ${categoryCode} não encontrada para subcategorias`)
      return
    }

    let newSubcategories = 0
    let updatedSubcategories = 0

    for (const subData of subcategories) {
      const existingSubcategory = await prisma.subcategory.findUnique({
        where: { code: subData.codigo }
      })

      if (existingSubcategory) {
        // Atualizar se necessário
        if (existingSubcategory.name !== subData.nome || 
            existingSubcategory.description !== subData.descricao ||
            existingSubcategory.categoryId !== category.id) {
          await prisma.subcategory.update({
            where: { id: existingSubcategory.id },
            data: {
              name: subData.nome,
              description: subData.descricao || null,
              categoryId: category.id
            }
          })
          updatedSubcategories++
        }
      } else {
        // Criar nova subcategoria
        await prisma.subcategory.create({
          data: {
            code: subData.codigo,
            name: subData.nome,
            description: subData.descricao || null,
            categoryId: category.id
          }
        })
        newSubcategories++
      }
    }

    if (newSubcategories > 0 || updatedSubcategories > 0) {
      console.log(`  └─ Subcategorias para ${categoryCode}: ${newSubcategories} novas, ${updatedSubcategories} atualizadas`)
    }
  }

  private async syncMaterials(): Promise<void> {
    console.log('🔧 Sincronizando materiais...')
    
    let page = 1
    let totalMaterials = 0
    let newMaterials = 0
    let updatedMaterials = 0
    let inactivatedMaterials = 0

    try {
      // Marcar todos os materiais como potencialmente inativos
      await prisma.material.updateMany({
        data: { active: false }
      })

      do {
        console.log(`📄 Processando página ${page}...`)
        
        const response = await axios.get(`${this.API_BASE_URL}/materiais`, {
          params: {
            pagina: page,
            por_pagina: this.BATCH_SIZE
          },
          timeout: 60000,
          headers: {
            'User-Agent': 'CATMAT-Align/1.0'
          }
        })

        const data: CatmatResponse = response.data
        const materials = data.materiais || []
        
        if (materials.length === 0) {
          break
        }

        // Processar materiais em lotes
        for (const materialData of materials) {
          try {
            const result = await this.processMaterial(materialData)
            
            if (result === 'new') newMaterials++
            else if (result === 'updated') updatedMaterials++
            
            totalMaterials++
            
          } catch (error) {
            console.error(`❌ Erro ao processar material ${materialData.codigo}:`, error)
          }
        }

        console.log(`  ✓ Processados ${materials.length} materiais da página ${page}`)
        page++
        
        // Pausa entre requisições para não sobrecarregar a API
        await this.sleep(1000)
        
      } while (true)

      // Contar materiais inativados (que não foram atualizados)
      inactivatedMaterials = await prisma.material.count({
        where: { active: false }
      })

      console.log(`📊 Resumo da sincronização:`)
      console.log(`  • Total processados: ${totalMaterials}`)
      console.log(`  • Novos: ${newMaterials}`)
      console.log(`  • Atualizados: ${updatedMaterials}`)
      console.log(`  • Inativados: ${inactivatedMaterials}`)

      // Atualizar log com estatísticas
      if (this.syncLogId) {
        await prisma.syncLog.update({
          where: { id: this.syncLogId },
          data: {
            totalRecords: totalMaterials,
            newRecords: newMaterials,
            updatedRecords: updatedMaterials,
            deletedRecords: inactivatedMaterials,
            details: {
              totalMaterials,
              newMaterials,
              updatedMaterials,
              inactivatedMaterials
            }
          }
        })
      }

    } catch (error) {
      console.error('❌ Erro ao sincronizar materiais:', error)
      throw error
    }
  }

  private async processMaterial(materialData: CatmatMaterial): Promise<'new' | 'updated' | 'unchanged'> {
    // Buscar categoria
    const category = materialData.categoria 
      ? await prisma.category.findUnique({ where: { code: materialData.categoria.codigo } })
      : null

    // Buscar subcategoria se existir
    const subcategory = materialData.subcategoria
      ? await prisma.subcategory.findUnique({ where: { code: materialData.subcategoria.codigo } })
      : null

    // Processar palavras-chave
    const keywords = materialData.palavras_chave || []
    const searchVector = this.generateSearchVector(materialData.descricao, keywords)

    // Verificar se material já existe
    const existingMaterial = await prisma.material.findUnique({
      where: { code: materialData.codigo }
    })

    const materialDataToSave = {
      code: materialData.codigo,
      name: materialData.descricao,
      unit: materialData.unidade_fornecimento || null,
      active: materialData.ativo,
      keywords,
      searchVector,
      categoryId: category?.id || null,
      subcategoryId: subcategory?.id || null
    }

    if (existingMaterial) {
      // Verificar se precisa atualizar
      const needsUpdate = 
        existingMaterial.name !== materialDataToSave.name ||
        existingMaterial.unit !== materialDataToSave.unit ||
        existingMaterial.active !== materialDataToSave.active ||
        existingMaterial.categoryId !== materialDataToSave.categoryId ||
        existingMaterial.subcategoryId !== materialDataToSave.subcategoryId ||
        JSON.stringify(existingMaterial.keywords) !== JSON.stringify(materialDataToSave.keywords) ||
        existingMaterial.searchVector !== materialDataToSave.searchVector

      if (needsUpdate) {
        await prisma.material.update({
          where: { id: existingMaterial.id },
          data: materialDataToSave
        })
        return 'updated'
      }
      
      // Se não precisa atualizar, apenas marcar como ativo
      await prisma.material.update({
        where: { id: existingMaterial.id },
        data: { active: materialDataToSave.active }
      })
      
      return 'unchanged'
    } else {
      // Criar novo material
      await prisma.material.create({
        data: materialDataToSave
      })
      return 'new'
    }
  }

  private generateSearchVector(description: string, keywords: string[]): string {
    // Criar vetor de busca combinando descrição e palavras-chave
    const allText = [description, ...keywords].join(' ')
    
    return allText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, ' ') // Remove pontuação
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim()
  }

  private async completSync(): Promise<void> {
    if (!this.syncLogId) return

    await prisma.syncLog.update({
      where: { id: this.syncLogId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })
  }

  private async failSync(error: Error): Promise<void> {
    if (!this.syncLogId) return

    await prisma.syncLog.update({
      where: { id: this.syncLogId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: error.message,
        errorCount: 1
      }
    })
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Função principal
async function main() {
  const syncService = new CatmatSyncService()
  
  try {
    await syncService.startSync()
    process.exit(0)
  } catch (error) {
    console.error('💥 Falha na sincronização:', error)
    process.exit(1)
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main()
}

export { CatmatSyncService }