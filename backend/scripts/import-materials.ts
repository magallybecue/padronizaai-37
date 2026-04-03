import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'

const prisma = new PrismaClient()

async function importMaterials() {
  try {
    console.log('🔄 Iniciando importação de 326.195 materiais...')
    console.log('⏱️  Isso pode demorar alguns minutos...')
    
    const csvData = readFileSync('../data/materials.csv', 'utf8')
    
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ';',  // <- MUDANÇA AQUI: usar ponto e vírgula
      quote: '"',
      escape: '"',
      relax_quotes: true,
      relax_column_count: true  // Permite colunas extras/faltantes
    })

    console.log(`📋 Lendo ${records.length} materiais do CSV`)
    
    // Verificar estrutura dos dados
    if (records.length > 0) {
      console.log('📋 Primeira linha (exemplo):')
      console.log(Object.keys(records[0]))
    }
    
    // Limpar tabela antes de importar
    console.log('🗑️  Limpando dados antigos...')
    await prisma.catmatMaterial.deleteMany({})
    
    let imported = 0
    let errors = 0
    const batchSize = 500 // Reduzir tamanho do lote

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      const materialsBatch = []

      for (const record of batch) {
        try {
          // Limpar strings e remover espaços extras
          const cleanString = (str) => {
            if (!str) return null
            return str.toString().trim().replace(/\s+/g, ' ') || null
          }

          const materialData = {
            codigoItem: cleanString(record.codigoItem),
            descricaoItem: cleanString(record.descricaoItem),
            unit: cleanString(record.unit) || 'UN', // Valor padrão
            Categoria: cleanString(record.Categoria),
            Subcategoria: cleanString(record.Subcategoria),
            codigoPdm: cleanString(record.codigoPdm),
            nomePdm: cleanString(record.nomePdm),
            statusItem: record.statusItem === 'VERDADEIRO' || record.statusItem === 'true' || record.statusItem === '1' || true,
            codigo_ncm: cleanString(record.codigo_ncm),
            keywords: extractKeywords(cleanString(record.descricaoItem) || ''),
            searchVector: createSearchVector(cleanString(record.descricaoItem) || ''),
            dataHoraAtualizacao: new Date()
          }

          // Validar dados essenciais
          if (materialData.codigoItem && materialData.descricaoItem && 
              materialData.codigoItem.length > 0 && materialData.descricaoItem.length > 0) {
            materialsBatch.push(materialData)
          } else {
            errors++
          }
        } catch (error) {
          console.error(`❌ Erro na linha ${i + batch.indexOf(record) + 1}:`, error.message)
          errors++
        }
      }

      // Inserir lote
      if (materialsBatch.length > 0) {
        try {
          await prisma.catmatMaterial.createMany({
            data: materialsBatch,
            skipDuplicates: true
          })
          imported += materialsBatch.length
        } catch (error) {
          console.error(`❌ Erro ao inserir lote ${Math.floor(i/batchSize) + 1}:`, error.message)
          errors += materialsBatch.length
        }
      }

      // Log de progresso a cada 5000 registros
      if ((i + batchSize) % 5000 === 0 || i + batchSize >= records.length) {
        const progress = Math.round(Math.min((i + batchSize) / records.length * 100, 100))
        console.log(`✅ Progresso: ${progress}% (${imported} importados, ${errors} erros)`)
      }
    }

    // Estatísticas finais
    const totalInDB = await prisma.catmatMaterial.count()
    
    console.log(`🎉 Importação concluída:`)
    console.log(`   - Total linhas CSV: ${records.length}`)
    console.log(`   - Materiais importados: ${imported}`)
    console.log(`   - Erros/pulos: ${errors}`)
    console.log(`   - Total no banco: ${totalInDB}`)

    console.log('✅ Importação concluída!')

  } catch (error) {
    console.error('❌ Erro na importação:', error)
  } finally {
    await prisma.$disconnect()
  }
}

function extractKeywords(description: string): string[] {
  if (!description) return []
  
  return description
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .split(/[\s,.-\/]+/)
    .filter(word => word.length > 2)
    .filter(word => !['para', 'com', 'por', 'dos', 'das', 'del', 'que', 'uma', 'com', 'sem', 'nome'].includes(word))
    .slice(0, 15)
}

function createSearchVector(description: string): string {
  return description
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

importMaterials()
