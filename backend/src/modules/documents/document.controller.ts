import type { NextFunction, Response } from 'express'
import multer from 'multer'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import {
  createDocument,
  addDocumentVersion,
  listDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  getDocumentVersionFile,
  getDocumentOptions,
  DocumentError,
} from './document.service.js'
import {
  createDocumentSchema,
  updateDocumentSchema,
  addVersionSchema,
  listDocumentsSchema,
  documentIdSchema,
  versionNoSchema,
} from './document.validation.js'

// Multer memory storage (up to 25MB per file)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 1,
  },
})

export const uploadDocumentFile = upload.single('file')

function actorId(req: AuthenticatedRequest): number {
  const id = Number(req.user?.id)
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new DocumentError('Authentication required', 401)
  }
  return id
}

function handleError(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof DocumentError) {
    res.status(error.statusCode).json({ success: false, message: error.message })
    return
  }
  if (error instanceof Error && error.name === 'ZodError') {
    res.status(400).json({ success: false, message: error.message, error })
    return
  }
  next(error)
}

export async function listDocumentsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const query = listDocumentsSchema.parse(req.query)
    const result = await listDocuments(query)
    res.json({ success: true, data: result })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getDocumentByIdController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = documentIdSchema.parse(req.params.id)
    const document = await getDocumentById(id)
    res.json({ success: true, data: document })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function createDocumentController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = actorId(req)
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Please attach a document file' })
      return
    }

    const payload = createDocumentSchema.parse(req.body)
    const document = await createDocument(
      {
        ...payload,
        uploadedById: userId,
      },
      req.file,
      req.ip,
    )

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: document,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function addDocumentVersionController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = actorId(req)
    const id = documentIdSchema.parse(req.params.id)

    if (!req.file) {
      res.status(400).json({ success: false, message: 'Please attach a new version file' })
      return
    }

    const payload = addVersionSchema.parse(req.body)
    const document = await addDocumentVersion(
      id,
      userId,
      req.file,
      payload.replaceNote,
      req.ip,
    )

    res.status(201).json({
      success: true,
      message: 'New document version uploaded successfully',
      data: document,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function updateDocumentController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = actorId(req)
    const id = documentIdSchema.parse(req.params.id)
    const payload = updateDocumentSchema.parse(req.body)
    const document = await updateDocument(id, userId, payload, req.ip)

    res.json({
      success: true,
      message: 'Document updated successfully',
      data: document,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function deleteDocumentController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = actorId(req)
    const id = documentIdSchema.parse(req.params.id)
    const result = await deleteDocument(id, userId, req.ip)
    res.json(result)
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function downloadDocumentController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = documentIdSchema.parse(req.params.id)
    const versionNo = req.params.versionNo ? versionNoSchema.parse(req.params.versionNo) : undefined
    const { filePath, originalFileName, mimeType } = await getDocumentVersionFile(id, versionNo)

    res.setHeader('Content-Type', mimeType)
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(originalFileName)}"`,
    )
    res.sendFile(filePath)
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getDocumentOptionsController(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const options = await getDocumentOptions()
    res.json({ success: true, data: options })
  } catch (error) {
    handleError(error, res, next)
  }
}
