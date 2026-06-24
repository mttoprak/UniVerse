import { z } from "zod";

export const sendMessageSchema = z.object({
    // Regex yerine Zod'un kendi .uuid() kontrolünü kullanıyoruz
    conversationId: z.string().uuid('Geçersiz conversation ID').optional(),
    listingId:      z.string().uuid('Geçersiz listing ID').optional(),

    text:           z.string().trim().max(2000).optional(),
    // Fotoğraflar frontend'den Cloudinary URL'si olarak array içinde gelecek
    photos:         z.array(z.string().url('Geçersiz fotoğraf URLsi')).max(5, 'En fazla 5 fotoğraf gönderebilirsiniz').optional(),
    location:       z.string().url('Geçerli bir Google Maps URL giriniz').optional(),

    offerPrice:     z.coerce.number().min(0, 'Fiyat 0 dan küçük olamaz').optional(),
    offerPricePer:  z.enum(['One Time', 'Per Month', 'Per Session']).optional(),
    offerNote:      z.string().trim().max(1000).optional(),
}).refine(data => {
    // Fotoğraf gelmiş mi diye de kontrol ediyoruz
    const hasPhotos = data.photos && data.photos.length > 0;
    const hasContent = !!(data.text || data.location || data.offerPrice !== undefined || hasPhotos);

    // Fiyat yokken periyot veya not gönderilirse engelle
    const hasOfferDetails = !!(data.offerPricePer || data.offerNote);
    const hasPrice = data.offerPrice !== undefined;

    if (hasOfferDetails && !hasPrice) {
        return false;
    }

    return hasContent;
}, {
    message: 'Mesajda en az bir içerik olmalı veya teklif detayları girildiyse teklif fiyatı (offerPrice) zorunludur.',
}).transform(data => {
    // Eğer kullanıcı bir fiyat girdiyse ve periyodu boş bıraktıysa otomatik default değer ata
    if (data.offerPrice !== undefined && !data.offerPricePer) {
        data.offerPricePer = 'One Time';
    }
    return data;
});