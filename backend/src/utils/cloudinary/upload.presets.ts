export type UploadPresetKey = 'profilePhoto' | 'postPhoto' | 'postVideo';

interface ImagePreset {
    type: 'image';
    folder: string;
    maxWidth: number;
    maxHeight: number;
    quality: string;
    maxFileSizeMB: number;
}

interface VideoPreset {
    type: 'video';
    folder: string;
    maxDurationSec: number;
    quality: string;
    maxFileSizeMB: number;
}

type Preset = ImagePreset | VideoPreset;

export const UPLOAD_PRESETS: Record<UploadPresetKey, Preset> = {
    profilePhoto: {
        type: 'image',
        folder: 'universe/profiles',
        maxWidth: 400,
        maxHeight: 400,
        quality: 'auto:good',
        maxFileSizeMB: 5,
    },
    postPhoto: {
        type: 'image',
        folder: 'universe/posts',
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 'auto:good',
        maxFileSizeMB: 10,
    },
    postVideo: {
        type: 'video',
        folder: 'universe/videos',
        maxDurationSec: 60,       // max 1 dakika
        quality: 'auto',
        maxFileSizeMB: 100,
    },
};