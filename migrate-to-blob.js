/**
 * Migration script: Upload local /uploads/ files to Vercel Blob
 * and update database URLs from /uploads/xxx to https://...blob.vercel-storage.com/...
 */
const { PrismaClient } = require('@prisma/client')
const { put } = require('@vercel/blob')
const fs = require('fs')
const path = require('path')

const DATABASE_URL = 'postgresql://neondb_owner:npg_KWPvQ1YZmFG8@ep-small-pine-ajbbinww-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require'
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN

if (!BLOB_TOKEN) {
  console.error('ERROR: BLOB_READ_WRITE_TOKEN environment variable is required')
  process.exit(1)
}

const prisma = new PrismaClient({
  datasources: { db: { url: DATABASE_URL } }
})

const UPLOADS_DIR = path.join(__dirname, 'uploads')

async function uploadToBlob(filename) {
  const filePath = path.join(UPLOADS_DIR, filename)
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP: File not found locally: ${filename}`)
    return null
  }

  const buffer = fs.readFileSync(filePath)
  const ext = path.extname(filename).toLowerCase()
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
  }
  const contentType = contentTypes[ext] || 'application/octet-stream'

  try {
    const blob = await put(`uploads/${filename}`, buffer, {
      access: 'public',
      contentType,
      token: BLOB_TOKEN,
    })
    console.log(`  UPLOADED: ${filename} -> ${blob.url}`)
    return blob.url
  } catch (err) {
    console.error(`  FAILED: ${filename} - ${err.message}`)
    return null
  }
}

async function migrate() {
  console.log('Starting migration of local uploads to Vercel Blob...\n')

  const tasks = await prisma.task.findMany({
    select: { id: true, description: true, beforePhotos: true, afterPhotos: true, documents: true }
  })

  let totalUpdated = 0
  let totalUploaded = 0

  for (const task of tasks) {
    let changed = false

    // Process beforePhotos
    const beforePhotos = JSON.parse(task.beforePhotos || '[]')
    const newBefore = []
    for (const url of beforePhotos) {
      if (url.startsWith('/uploads/')) {
        const filename = url.replace('/uploads/', '')
        const blobUrl = await uploadToBlob(filename)
        if (blobUrl) {
          newBefore.push(blobUrl)
          totalUploaded++
          changed = true
        } else {
          newBefore.push(url) // Keep original if upload failed
        }
      } else {
        newBefore.push(url) // Already a blob URL
      }
    }

    // Process afterPhotos
    const afterPhotos = JSON.parse(task.afterPhotos || '[]')
    const newAfter = []
    for (const url of afterPhotos) {
      if (url.startsWith('/uploads/')) {
        const filename = url.replace('/uploads/', '')
        const blobUrl = await uploadToBlob(filename)
        if (blobUrl) {
          newAfter.push(blobUrl)
          totalUploaded++
          changed = true
        } else {
          newAfter.push(url)
        }
      } else {
        newAfter.push(url)
      }
    }

    // Process documents
    const documents = JSON.parse(task.documents || '[]')
    const newDocs = []
    for (const doc of documents) {
      if (doc.url && doc.url.startsWith('/uploads/')) {
        const filename = doc.url.replace('/uploads/', '')
        const blobUrl = await uploadToBlob(filename)
        if (blobUrl) {
          newDocs.push({ ...doc, url: blobUrl })
          totalUploaded++
          changed = true
        } else {
          newDocs.push(doc)
        }
      } else {
        newDocs.push(doc)
      }
    }

    // Update database if any URLs changed
    if (changed) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          beforePhotos: JSON.stringify(newBefore),
          afterPhotos: JSON.stringify(newAfter),
          documents: JSON.stringify(newDocs),
        }
      })
      console.log(`  UPDATED DB: ${task.description.substring(0, 40)}...`)
      totalUpdated++
    }
  }

  console.log(`\nMigration complete!`)
  console.log(`  Tasks updated: ${totalUpdated}`)
  console.log(`  Files uploaded to Blob: ${totalUploaded}`)
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
