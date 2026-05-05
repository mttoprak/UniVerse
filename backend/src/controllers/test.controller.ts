// src/controllers/test.controller.ts
import { Request, Response } from 'express';
import { uploadSingle, uploadMultiple, deleteFile } from '../utils/cloudinary/uploader.util';
import { UploadPresetKey } from '../utils/cloudinary/upload.presets';

export const testSingleUpload = async (req: Request, res: Response) => {
    try {
        const preset = (req.query.preset as UploadPresetKey) || 'ListingPhoto';
        const result = await uploadSingle(req.file!, preset);
        res.json({ success: true, result });
    } catch (err: any) {
        res.status(400).json({ success: false, error: err.message });
    }
};

export const testMultipleUpload = async (req: Request, res: Response) => {
    try {
        const files = req.files as Express.Multer.File[];
        const results = await uploadMultiple(files, 'listingPhoto', 5);
        res.json({ success: true, count: results.length, results });
    } catch (err: any) {
        res.status(400).json({ success: false, error: err.message });
    }
};

export const testVideoUpload = async (req: Request, res: Response) => {
    try {
        const result = await uploadSingle(req.file!, 'listingVideo');
        res.json({ success: true, result });
    } catch (err: any) {
        res.status(400).json({ success: false, error: err.message });
    }
};

export const testDeleteFile = async (req: Request, res: Response) => {
    try {
        const type = (req.query.type as 'image' | 'video') || 'image';
        await deleteFile(String(req.params.publicId), type);
        res.json({ success: true, message: 'Deleted' });
    } catch (err: any) {
        res.status(400).json({ success: false, error: err.message });
    }
};