import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local'
const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || './uploads'
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'

// R2 Configuration
const R2_ENDPOINT = process.env.R2_ENDPOINT
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL

if (STORAGE_TYPE === 'local') {
  if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true })
  }
}

export const FILE_LIMITS = {
  IMAGE: 5 * 1024 * 1024,
  DOCUMENT: 10 * 1024 * 1024,
  OTHER: 2 * 1024 * 1024,
}

export const ALLOWED_TYPES = {
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  OTHER: ['text/plain', 'text/csv'],
}

export type FileCategory = 'IMAGE' | 'DOCUMENT' | 'RECEIPT' | 'OTHER'

export function getCategoryFromMimeType(mimeType: string): FileCategory {
  if (ALLOWED_TYPES.IMAGE.includes(mimeType)) return 'IMAGE'
  if (ALLOWED_TYPES.DOCUMENT.includes(mimeType)) return 'DOCUMENT'
  return 'OTHER'
}

export function isAllowedType(mimeType: string): boolean {
  return [
    ...ALLOWED_TYPES.IMAGE,
    ...ALLOWED_TYPES.DOCUMENT,
    ...ALLOWED_TYPES.OTHER,
  ].includes(mimeType)
}

export function getFileSizeLimit(mimeType: string): number {
  if (ALLOWED_TYPES.IMAGE.includes(mimeType)) return FILE_LIMITS.IMAGE
  if (ALLOWED_TYPES.DOCUMENT.includes(mimeType)) return FILE_LIMITS.DOCUMENT
  return FILE_LIMITS.OTHER
}

export interface UploadResult {
  storageKey: string
  url: string
  filename: string
}

export interface StorageService {
  upload(buffer: Buffer, originalName: string, mimeType: string): Promise<UploadResult>
  delete(storageKey: string): Promise<void>
  getUrl(storageKey: string): string
}

function getExtFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/plain': '.txt',
    'text/csv': '.csv',
  }
  return map[mimeType] || ''
}

class LocalStorageService implements StorageService {
  async upload(buffer: Buffer, originalName: string, mimeType: string): Promise<UploadResult> {
    const ext = path.extname(originalName) || getExtFromMime(mimeType)
    const filename = `${randomUUID()}${ext}`
    const storageKey = filename
    const filePath = path.join(LOCAL_UPLOAD_DIR, filename)
    
    await fs.promises.writeFile(filePath, buffer)
    
    return {
      storageKey,
      url: `${BASE_URL}/uploads/${filename}`,
      filename,
    }
  }
  
  async delete(storageKey: string): Promise<void> {
    const filePath = path.join(LOCAL_UPLOAD_DIR, storageKey)
    try {
      await fs.promises.unlink(filePath)
    } catch (error) {
      console.warn(`Could not delete file: ${storageKey}`)
    }
  }
  
  getUrl(storageKey: string): string {
    return `${BASE_URL}/uploads/${storageKey}`
  }
}

class R2StorageService implements StorageService {
  private s3: S3Client

  constructor() {
    if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
      throw new Error('R2 storage requires R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL environment variables')
    }

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  }

  async upload(buffer: Buffer, originalName: string, mimeType: string): Promise<UploadResult> {
    const ext = path.extname(originalName) || getExtFromMime(mimeType)
    const filename = `${randomUUID()}${ext}`
    const storageKey = `uploads/${filename}`

    await this.s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
      Body: buffer,
      ContentType: mimeType,
    }))

    return {
      storageKey,
      url: `${R2_PUBLIC_URL}/${storageKey}`,
      filename,
    }
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await this.s3.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: storageKey,
      }))
    } catch (error) {
      console.warn(`Could not delete file from R2: ${storageKey}`, error)
    }
  }

  getUrl(storageKey: string): string {
    return `${R2_PUBLIC_URL}/${storageKey}`
  }
}

export const storageService: StorageService = 
  STORAGE_TYPE === 'r2' 
    ? new R2StorageService() 
    : new LocalStorageService()