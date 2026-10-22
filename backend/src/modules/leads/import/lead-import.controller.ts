
import type { Request, Response, NextFunction } from "express";
import multer from "multer";

import {
  LeadImportError,
  parseLeadImportFile,
} from "./lead-import.utils";
import { confirmImportSchema } from "./lead-import.validation";
import { confirmLeadImport } from "./lead-import.service";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const extension = file.originalname
      .toLowerCase()
      .split(".")
      .pop();

    if (extension !== "csv" && extension !== "xlsx") {
      callback(
        new LeadImportError(
          "Only CSV and XLSX files are supported.",
        ),
      );
      return;
    }

    callback(null, true);
  },
});

export const uploadLeadImportFile = upload.single("file");

export async function previewLeadImport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "Please upload a CSV or XLSX file using the 'file' field.",
      });
      return;
    }

    const parsed = parseLeadImportFile(
      req.file.buffer,
      req.file.originalname,
    );

    res.status(200).json({
      success: true,
      message: "File parsed successfully.",
      data: {
        totalRows: parsed.rows.length,
        duplicateCount: parsed.duplicates.length,
        duplicates: parsed.duplicates,
        rows: parsed.rows,
      },
    });
  } catch (error) {
    next(error);
  }
}


export async function confirmLeadImportController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = confirmImportSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid import data.",
        errors: parsed.error.issues,
      });
      return;
    }

    // Adjust this property to match your authentication middleware.
    const createdById = Number(
      (req as Request & { user?: { id?: number | string } }).user?.id,
    );

    if (!Number.isInteger(createdById) || createdById <= 0) {
      res.status(401).json({
        success: false,
        message: "Authenticated user ID was not found.",
      });
      return;
    }

    const report = await confirmLeadImport(
      parsed.data.rows,
      createdById,
    );

    res.status(200).json({
      success: true,
      message: "Lead import completed.",
      data: report,
    });
  } catch (error) {
    next(error);
  }
}
