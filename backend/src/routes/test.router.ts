import { Router } from 'express';
import multer from 'multer';
import {
    testSingleUpload,
    testMultipleUpload,
    testVideoUpload,
    testDeleteFile,
} from '../controllers/test.controller';

const router = Router()
const upload = multer({ storage: multer.memoryStorage() });


// POST /api/test/upload/single
router.post('/upload/single', upload.single('file'), testSingleUpload);
router.post('/upload/multiple', upload.array('files', 5), testMultipleUpload);
router.post('/upload/video', upload.single('file'), testVideoUpload);
router.delete('/upload/:publicId', testDeleteFile);

export default router