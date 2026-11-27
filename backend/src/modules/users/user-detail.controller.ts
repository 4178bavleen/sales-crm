import type { NextFunction, Response } from 'express'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { ZodError } from 'zod'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { UserServiceError } from './user.service.js'
import {
  getUserDetail,
  updateBankDetails,
  updateCompanyDetails,
  updateEmployeeAvatar,
  updateEmployeeIdCard,
  updatePersonalDetails,
} from './user-detail.service.js'
import {
  bankDetailsSchema,
  companyDetailsSchema,
  personalDetailsSchema,
  userDetailIdSchema,
} from './user-detail.validation.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
})
export const uploadEmployeeFile = upload.single('file')

function handleError(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    })
    return
  }
  if (error instanceof UserServiceError) {
    res.status(error.statusCode).json({ success: false, message: error.message })
    return
  }
  next(error)
}

function saveFile(dir: string, userId: number, file: Express.Multer.File) {
  const base = path.join(process.cwd(), 'uploads', dir)
  fs.mkdirSync(base, { recursive: true })
  const ext = path.extname(file.originalname || '').toLowerCase() || '.bin'
  const name = `${dir}-${userId}-${Date.now()}${ext}`
  fs.writeFileSync(path.join(base, name), file.buffer)
  return `/uploads/${dir}/${name}`
}

export async function getUserDetailHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = userDetailIdSchema.parse(req.params.id)
    const user = await getUserDetail(id)
    res.status(200).json({ success: true, data: { user } })
  } catch (e) { handleError(e, res, next) }
}

export async function updatePersonalDetailsHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = userDetailIdSchema.parse(req.params.id)
    const input = personalDetailsSchema.parse(req.body)
    const user = await updatePersonalDetails(id, input)
    res.status(200).json({ success: true, message: 'Personal details saved', data: { user } })
  } catch (e) { handleError(e, res, next) }
}

export async function updateBankDetailsHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = userDetailIdSchema.parse(req.params.id)
    const input = bankDetailsSchema.parse(req.body)
    const user = await updateBankDetails(id, input)
    res.status(200).json({ success: true, message: 'Bank details saved', data: { user } })
  } catch (e) { handleError(e, res, next) }
}

export async function updateCompanyDetailsHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = userDetailIdSchema.parse(req.params.id)
    const input = companyDetailsSchema.parse(req.body)
    const user = await updateCompanyDetails(id, input)
    res.status(200).json({ success: true, message: 'Company details saved', data: { user } })
  } catch (e) { handleError(e, res, next) }
}

export async function uploadEmployeeAvatarHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = userDetailIdSchema.parse(req.params.id)
    if (!req.file) { res.status(400).json({ success: false, message: 'File required' }); return }
    const filePath = saveFile('employee-avatars', id, req.file)
    const user = await updateEmployeeAvatar(id, filePath)
    res.status(200).json({ success: true, message: 'Image uploaded', data: { user } })
  } catch (e) { handleError(e, res, next) }
}

export async function uploadEmployeeIdCardHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = userDetailIdSchema.parse(req.params.id)
    if (!req.file) { res.status(400).json({ success: false, message: 'File required' }); return }
    const filePath = saveFile('employee-id-cards', id, req.file)
    const user = await updateEmployeeIdCard(id, filePath, req.file.originalname)
    res.status(200).json({ success: true, message: 'ID card uploaded', data: { user } })
  } catch (e) { handleError(e, res, next) }
}
