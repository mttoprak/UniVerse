import { z } from "zod"

// sendMessage
export const sendMessageSchema = z.object({
    listingId:      z.string().regex(/^[0-9a-fA-F]{24}$/, 'Geçersiz listing ID'),
    text:           z.string().trim().max(2000).optional(),
    location:       z.string().url('Geçerli bir Google Maps URL giriniz').optional(),//TODO: Burada google maps linkinin daha katı doğrulanması
    offerPrice:     z.coerce.number().min(0, 'Fiyat 0 dan küçük olamaz').optional(),
    offerPricePer:  z.enum(['One Time', 'Per Month', 'Per Session']).optional(),
    offerNote:      z.string().trim().max(1000).optional(),
}).refine(data => {
    //En az bir içerik kontrolü
    const hasContent = !!(data.text || data.location || data.offerPrice !== undefined);

    //Fiyat yokken periyot veya not gönderilirse engelle
    const hasOfferDetails = !!(data.offerPricePer || data.offerNote);
    const hasPrice = data.offerPrice !== undefined;

    if (hasOfferDetails && !hasPrice) {
        return false;
    }

    return hasContent;
}, {
    message: 'Mesajda en az bir içerik olmalı veya teklif detayları girildiyse teklif fiyatı (offerPrice) zorunludur.',
}).transform(data => {

    // Eğer kullanıcı bir fiyat girdiyse (yani teklif yapıyorsa) ve periyodu boş bıraktıysa/unuttuysa:
    if (data.offerPrice !== undefined && !data.offerPricePer) {
        data.offerPricePer = 'One Time'; // Otomatik olarak default değerini burda atıyoruz.
    }
    return data;
});