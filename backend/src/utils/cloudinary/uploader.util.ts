import { Readable } from 'stream';
import cloudinary from './cloudinary.config';
import { UPLOAD_PRESETS, UploadPresetKey } from './upload.presets';

export interface UploadedFile {
    url: string;
    publicId: string;
    type: 'image' | 'video';
    width?: number;
    height?: number;
    duration?: number; // seconds of video
}

// ─── Upload Single File ───────────────────────────────────────────────
export const uploadSingle = async (
    file: Express.Multer.File,
    preset: UploadPresetKey
): Promise<UploadedFile> => {
    const config = UPLOAD_PRESETS[preset];

    // File size control
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > config.maxFileSizeMB) {
        throw new Error(
            `File is too big. Max: ${config.maxFileSizeMB}MB, Your file: ${fileSizeMB.toFixed(1)}MB`
        );
    }

    const uploadOptions: Record<string, any> = {
        resource_type: config.type,
        folder: config.folder,
        fetch_format: 'auto',
        quality: config.quality,
    };

    // Special adjustments for image presets
    if (config.type === 'image') {
        uploadOptions.transformation = [
            {
                width: config.maxWidth,
                height: config.maxHeight,
                crop: 'limit', // It doesn't trim, makes fit
            },
        ];
    }

    // Special adjustments for video presets
    if (config.type === 'video') {
        uploadOptions.transformation = [
            {
                duration: config.maxDurationSec, // fazlasını kes
                quality: config.quality,
            },
        ];
        uploadOptions.eager = [
            // create thumbnail automatically
            { resource_type: 'image', format: 'jpg', transformation: [{ width: 400, height: 400, crop: 'fill' }] },
        ];
        uploadOptions.eager_async = true;
    }

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error || !result) return reject(error);

                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                    type: config.type,
                    width: result.width,
                    height: result.height,
                    duration: result.duration,
                });
            }
        );

        Readable.from(file.buffer).pipe(stream);
    });
};

// ─── Uploading Multiple Files (Listing Photos) ─────────────────────────
export const uploadMultiple = async (
    files: Express.Multer.File[],
    preset: UploadPresetKey,
    maxCount: number = 5
): Promise<UploadedFile[]> => {
    if (files.length > maxCount) {
        throw new Error(`You can upload ${maxCount} files.`);
    }

    // Uploading every single file in parallel
    const results = await Promise.allSettled(
        files.map((file) => uploadSingle(file, preset))
    );

    const uploaded: UploadedFile[] = [];
    const errors: string[] = [];

    results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
            uploaded.push(result.value);
        } else {
            errors.push(`File ${i + 1}: ${result.reason?.message}`);
        }
    });

    if (errors.length > 0) {
        throw new Error(`Some files couldn't uploaded:\n${errors.join('\n')}`);
    }

    return uploaded;
};

// ─── Deleting Files from Cloudinary ────────────────────────────────────────────
export const deleteFile = async (
    publicId: string,
    type: 'image' | 'video' = 'image'
): Promise<void> => {
    await cloudinary.uploader.destroy(publicId, { resource_type: type });
};