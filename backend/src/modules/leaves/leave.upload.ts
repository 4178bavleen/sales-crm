import multer from 'multer'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const baseBackendDir = process.cwd().endsWith('backend')
  ? process.cwd()
  : path.resolve(process.cwd(), 'backend')

export const LEAVE_UPLOAD_DIR = path.resolve(baseBackendDir, 'uploads', 'leaves')

if (!fs.existsSync(LEAVE_UPLOAD_DIR)) {
  fs.mkdirSync(LEAVE_UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, LEAVE_UPLOAD_DIR)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin'
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`
    cb(null, unique)
  },
})

export const uploadLeaveDocument = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'].includes(ext)
    if (allowed) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, PNG, and WEBP documents are allowed.'))
    }
  },
}).single('document')
