import { Readable } from 'stream';
import cloudinary from './cloudinary.config';
import { UPLOAD_PRESETS, UploadPresetKey } from './upload.presets';

export interface UploadedFile {
    url: string;
    publicId: string;
    type: 'image' | 'video';
    width?: number;
    height?: number;
    duration?: number; // video için saniye
}

// ─── Tek dosya yükle ───────────────────────────────────────────────
export const uploadSingle = async (
    file: Express.Multer.File,
    preset: UploadPresetKey
): Promise<UploadedFile> => {
    const config = UPLOAD_PRESETS[preset];

    // Boyut kontrolü
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > config.maxFileSizeMB) {
        throw new Error(
            `Dosya çok büyük. Max: ${config.maxFileSizeMB}MB, Gelen: ${fileSizeMB.toFixed(1)}MB`
        );
    }

    const uploadOptions: Record<string, any> = {
        resource_type: config.type,
        folder: config.folder,
        fetch_format: 'auto',
        quality: config.quality,
    };

    // Image preset'e özel ayarlar
    if (config.type === 'image') {
        uploadOptions.transformation = [
            {
                width: config.maxWidth,
                height: config.maxHeight,
                crop: 'limit', // zorla kırpmaz, sığdırır
            },
        ];
    }

    // Video preset'e özel ayarlar
    if (config.type === 'video') {
        uploadOptions.transformation = [
            {
                duration: config.maxDurationSec, // fazlasını kes
                quality: config.quality,
            },
        ];
        uploadOptions.eager = [
            // thumbnail otomatik üret
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

// ─── Çoklu dosya yükle (post fotoğrafları) ─────────────────────────
export const uploadMultiple = async (
    files: Express.Multer.File[],
    preset: UploadPresetKey,
    maxCount: number = 5
): Promise<UploadedFile[]> => {
    if (files.length > maxCount) {
        throw new Error(`En fazla ${maxCount} dosya yükleyebilirsin.`);
    }

    // Hepsini paralel yükle
    const results = await Promise.allSettled(
        files.map((file) => uploadSingle(file, preset))
    );

    const uploaded: UploadedFile[] = [];
    const errors: string[] = [];

    results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
            uploaded.push(result.value);
        } else {
            errors.push(`Dosya ${i + 1}: ${result.reason?.message}`);
        }
    });

    if (errors.length > 0) {
        throw new Error(`Bazı dosyalar yüklenemedi:\n${errors.join('\n')}`);
    }

    return uploaded;
};

// ─── Cloudinary'den sil ────────────────────────────────────────────
export const deleteFile = async (
    publicId: string,
    type: 'image' | 'video' = 'image'
): Promise<void> => {
    await cloudinary.uploader.destroy(publicId, { resource_type: type });
};