import { Router } from 'express';
import multer from 'multer';
// import {
//     testSingleUpload,
//     testMultipleUpload,
//     testVideoUpload,
//     testDeleteFile,
// } from '../controllers/test.controller';
import * as TC from '../controllers/test.controller';
import {authMiddleware} from "../middleware/middleware";

const router = Router()
const upload = multer({ storage: multer.memoryStorage() });


// POST /api/test/upload/single
router.post('/upload/single', upload.single('file'), authMiddleware,                  TC.testSingleUpload);
router.post('/upload/multiple', upload.array('files', 5), authMiddleware,    TC.testMultipleUpload);
router.post('/upload/video', upload.single('file'), authMiddleware,                   TC.testVideoUpload);
router.delete('/upload/:publicId', authMiddleware,                                              TC.testDeleteFile);

export default router