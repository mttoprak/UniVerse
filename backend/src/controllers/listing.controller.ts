import { Request, Response } from 'express'
import { Listing } from "../models/Listing"
import { uploadSingle, uploadMultiple, deleteFile } from '../utils/cloudinary/uploader.util';
import { createListingSchema, updateListingSchema } from '../validators/listing.validator'
import {z} from "zod";

/**
 * Helper Func: Cloudinary URL'den publicId'yi çıkarır
 * Örn: "https://res.cloudinary.com/xxx/image/upload/v1234/folder/file.jpg" -> "folder/file"
 */
const getPublicIdFromUrl = (url: string) => {
    const parts = url.split('/');
    const fileWithExtension = parts.pop(); // file.jpg
    const folderPath = parts.slice(parts.indexOf('upload') + 2).join('/'); // v1234'ü de atla
    const fileName = fileWithExtension?.split('.')[0]; // extension'ı at
    return folderPath ? `${folderPath}/${fileName}` : fileName || '';
}

// ─── CREATE ────────────────────────────────────────────────────────────────

export const createListing = async (req: Request, res: Response): Promise<any> => {
    try {
        const parsed = createListingSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({
                errors: z.treeifyError(parsed.error)
            });
        }

        const files = req.files as Express.Multer.File[]
        let photos: string[] = []

        if (files?.length) {
            const uploaded = await uploadMultiple(files, 'listingPhoto')
            photos = uploaded.map(f => f.url)
        }

        const listing = await Listing.create({
            ...parsed.data,
            photos,
            owner: req.userId,
        })

        return res.status(201).json({ listing })
    } catch (error) {
        console.error('Create listing error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}

// ─── GET ONE ───────────────────────────────────────────────────────────────

export const getListing = async (req: Request, res: Response): Promise<any> => {
    try {
        const listing = await Listing
            .findByIdAndUpdate(
                req.params.id,
                { $inc: { views: 1 } },  // atomik view sayacı
                { new: true }
            )
            .populate('owner', 'username avatar')

        if (!listing)
            return res.status(404).json({ error: 'Listing not found' })

        return res.json({ listing })
    } catch (error) {
        console.error('Get listing error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}

// ─── GET MANY (search + filter) ────────────────────────────────────────────

export const getListings = async (req: Request, res: Response): Promise<any> => {
    try {
        const { q, type, category, sort = 'newest', page = '1', limit = '20' } = req.query

        // Sayısal değerleri güvenli formata çevirme
        const pageNum = Math.max(1, Number(page) || 1)
        const limitNum = Math.max(1, Number(limit) || 20)

        const filter: Record<string, any> = { status: 'active' }

        if (q)        filter.$text     = { $search: q as string }
        if (type)     filter.type      = type
        if (category) filter.category  = category

        const sortMap: Record<string, any> = {
            newest:     { createdAt: -1 },
            oldest:     { createdAt:  1 },
            price_asc:  { price:   1 },
            price_desc: { price:  -1 },
            popular:    { views: -1 },
        }

        const listings = await Listing
            .find(filter)
            .sort(sortMap[sort as string] ?? sortMap.newest)
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .populate('owner', 'username avatar')

        return res.json({ listings, page: pageNum })
    } catch (error) {
        console.error('Get listings error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}

// ─── FEED ──────────────────────────────────────────────────────────────────

export const getFeedListings = async (req: Request, res: Response): Promise<any> => {
    try {
        const { page = '1', limit = '20' } = req.query

        // Güvenli Sayfalama
        const pageNum = Math.max(1, Number(page) || 1)
        const limitNum = Math.max(1, Number(limit) || 20)

        const listings = await Listing
            .find({ status: 'active' })
            .sort({ is_urgent: -1, createdAt: -1 }) // urgent'lar üste
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .populate('owner', 'username avatar')

        return res.json({ listings, page: pageNum })
    } catch (error) {
        console.error('Get feed listings error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}

// ─── USER LISTINGS ─────────────────────────────────────────────────────────

export const getUserListings = async (req: Request, res: Response): Promise<any> => {
    try {
        const listings = await Listing
            .find({ owner: req.params.uID, status: 'active' })
            .sort({ createdAt: -1 })

        return res.json({ listings })
    } catch (error) {
        console.error('Get user listings error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}

// ─── UPDATE ────────────────────────────────────────────────────────────────

export const updateListing = async (req: Request, res: Response): Promise<any> => {
    try {
        const parsed = updateListingSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({
                errors: z.treeifyError(parsed.error)
            });
        }

        const listing = await Listing.findOne({
            _id: req.params.id,
            owner: req.userId,
        })

        if (!listing)
            return res.status(404).json({ error: 'Listing not found' })

        const files = req.files as Express.Multer.File[]

        // --- 1. Korunacak Resimleri Yakala ---
        // Kullanıcı silmek istemediği (korunacak) resimlerin URL'lerini yollayabilir
        let retainedPhotos: string[] = listing.photos || [];
        if (req.body.retainedPhotos !== undefined) {
            if (Array.isArray(req.body.retainedPhotos)) {
                retainedPhotos = req.body.retainedPhotos;
            } else {
                try {
                    // JSON formatında ('["url1", "url2"]') gelmişse parse et
                    retainedPhotos = JSON.parse(req.body.retainedPhotos);
                } catch (e) {
                    // Tek bir url string olarak gelmişse
                    retainedPhotos = [req.body.retainedPhotos];
                }
            }
        }

        // --- 2. Silinecek Resimleri Tespit ve Yok Et ---
        // Veritabanındaki eski resimler içinde dön; eğer korunacaklar listesinde YΟKSA, silinecek demektir
        const photosToDelete = (listing.photos || []).filter(url => !retainedPhotos.includes(url));

        if (photosToDelete.length > 0) {
            const deletePromises = photosToDelete.map(url => {
                const publicId = getPublicIdFromUrl(url);
                return deleteFile(publicId, 'image').catch(err => {
                    console.error('Silinmesi istenen eski resim silinirken hata:', err);
                });
            });
            await Promise.all(deletePromises);
        }

        // --- 3. Yeni Gelen Dosyaları Yükle ---
        let newlyUploadedUrls: string[] = [];
        if (files && files.length > 0) {
            const uploaded = await uploadMultiple(files, 'listingPhoto');
            newlyUploadedUrls = uploaded.map(f => f.url);
        }

        // --- 4. Son Fotoğraf Listesini Birleştir ---
        // Eğer kullanıcı fotoğraf değişikliği yapmışsa (eskilerden sildiği varsa ya da yeni eklediği varsa)
        if (req.body.retainedPhotos !== undefined || newlyUploadedUrls.length > 0) {
            // Son liste = (silinmeyerek elde tutulan eski fotoğraflar) + (yeni yüklenen fotoğraflar)
            listing.photos = [...retainedPhotos, ...newlyUploadedUrls];
        }

        Object.assign(listing, parsed.data)
        await listing.save()

        return res.json({ listing })
    } catch (error) {
        console.error('Update listing error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}

// ─── DELETE ────────────────────────────────────────────────────────────────

export const deleteListing = async (req: Request, res: Response): Promise<any> => {
    try {
        const listing = await Listing.findOne({
            _id: req.params.id,
            owner: req.userId,   // sadece sahibi silebilir
        })

        if (!listing)
            return res.status(404).json({ error: 'Listing not found' })

        // Cloudinary fotoğraflarını sistemden temizle
        if (listing.photos && listing.photos.length > 0) {
            const deletePromises = listing.photos.map(async url => {
                const publicId = getPublicIdFromUrl(url);
                try {
                    return await deleteFile(publicId, 'image');
                } catch (err) {
                    console.error('Silme sırasında resim silme hatası:', err);
                }
            });
            await Promise.all(deletePromises);
        }

        await listing.deleteOne() // Kaydı veritabanından kaldır

        return res.json({ message: 'Listing deleted' })
    } catch (error) {
        console.error('Delete listing error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}