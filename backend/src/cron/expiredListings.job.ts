import cron from 'node-cron';
import { Listing } from '../models/Listing';

// Bu cron job her saat başı çalışıp süresi dolmuş ve hala aktif görünen ilanları 'expired' statüsüne çeker
export const startExpiredListingsCron = () => {

    const sweepExpiredListings = async () => {
        try {
            console.log('[CRON] Süresi dolmuş ilanlar kontrol ediliyor...');

            const now = new Date();

            const result = await Listing.updateMany(
                {
                    status: 'active',
                    expires: { $lt: now }
                },
                {
                    $set: { status: 'expired' }
                }
            );

            if (result.modifiedCount > 0) {
                console.log(`[CRON] Başarılı: ${result.modifiedCount} adet ilanın statüsü 'expired' olarak güncellendi.`);
            } else {
                console.log('[CRON] Süresi dolmuş aktif ilan bulunmadi.');
            }
        } catch (error) {
            console.error('[CRON] İlan süreleri kontrol edilirken bir hata oluştu:', error);
        }
    };

    // 1. Sunucu ayağa kalkar kalkmaz hemen BİR KERE temizlik yap
    sweepExpiredListings();

    // 2. Ardından her saat başı calismaya devam etmesi için cron kur
    cron.schedule('0 * * * *', sweepExpiredListings);

    console.log('[CRON] Sweeper servisi (Süresi Dolmuş İlanlar) başlatıldı ve ilk tarama yapılıyor.');
};
