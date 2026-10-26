import type { NextFunction, Response } from 'express'
import { ZodError } from 'zod'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import * as reportService from './reports.service.js'
import { ReportServiceError } from './reports.service.js'
import { reportQuerySchema } from './reports.validation.js'

function handleError(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof ZodError) {
    const errorDetails = error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join(', ')
    res.status(400).json({
      success: false,
      message: errorDetails ? `Validation failed: ${errorDetails}` : 'Validation failed',
      errors: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    })
    return
  }

  if (error instanceof ReportServiceError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    })
    return
  }

  next(error)
}

export async function getReportOptionsController(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const options = await reportService.getReportFilterOptions()
    res.status(200).json({
      success: true,
      message: 'Report options retrieved successfully',
      data: options,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getOverviewReportController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const query = reportQuerySchema.parse(req.query)
    const report = await reportService.getOverviewReport(query)
    res.status(200).json({
      success: true,
      message: 'Overview report retrieved successfully',
      data: report,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getLeadsReportController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const query = reportQuerySchema.parse(req.query)
    const report = await reportService.getLeadsReport(query)
    res.status(200).json({
      success: true,
      message: 'Leads report retrieved successfully',
      data: report,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getDealsReportController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const query = reportQuerySchema.parse(req.query)
    const report = await reportService.getDealsReport(query)
    res.status(200).json({
      success: true,
      message: 'Deals report retrieved successfully',
      data: report,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getRepPerformanceReportController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const query = reportQuerySchema.parse(req.query)
    const report = await reportService.getRepPerformanceReport(query)
    res.status(200).json({
      success: true,
      message: 'Rep performance report retrieved successfully',
      data: report,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function exportReportController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const query = reportQuerySchema.parse(req.query)
    const buffer = await reportService.exportReportToExcel(query)

    const filename = `sales-crm-report-${query.period || 'current'}-${Date.now()}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.status(200).send(buffer)
  } catch (error) {
    handleError(error, res, next)
  }
}
