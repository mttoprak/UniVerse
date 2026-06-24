import cron from 'node-cron';
import { prisma } from "../graphql/context";

// Bu cron job her saat başı çalışıp süresi dolmuş ve hala aktif görünen ilanları 'expired' statüsüne çeker
export const startExpiredListingsCron = () => {

    const sweepExpiredListings = async () => {
        try {
            console.log('[CRON] Süresi dolmuş ilanlar kontrol ediliyor...');

            // Prisma ile tek seferde filtrele ve güncelle (Mongoose'daki updateMany karşılığı)
            const result = await prisma.listing.updateMany({
                where: {
                    status: 'active', // Enum değerleri Prisma'da string literal olarak verilebilir
                    expires: {
                        lt: new Date() // Şu anki zamandan küçük (süresi geçmiş) olanlar
                    }
                },
                data: {
                    status: 'expired'
                }
            });

            if (result.count > 0) {
                console.log(`[CRON] Başarılı: ${result.count} adet ilanın statüsü 'expired' olarak güncellendi.`);
            } else {
                console.log('[CRON] Süresi dolmuş aktif ilan bulunmadı.');
            }

        } catch (error) {
            console.error('[CRON] İlan süreleri kontrol edilirken bir hata oluştu:', error);
        }
    }

    // 1. Sunucu ayağa kalkar kalkmaz hemen BİR KERE temizlik yap
    sweepExpiredListings();

    // 2. Ardından her saat başı calismaya devam etmesi için cron kur
    cron.schedule('0 * * * *', sweepExpiredListings);

    console.log('[CRON] Sweeper servisi (Süresi Dolmuş İlanlar) başlatıldı ve ilk tarama yapılıyor.');
};