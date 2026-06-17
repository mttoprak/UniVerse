import cron from 'node-cron';
import { prisma } from "../graphql/context";

export const startPendingVerificationCron = () => {

    const sweepExpiredPendingVerifications = async () => {
        try {

            console.log('[CRON] Süresi dolmuş doğrulama kodları kontrol ediliyor...');

            const result = await prisma.pendingVerification.deleteMany({
                where: {
                    expires: {
                        lt: new Date() // Şu anki zamandan daha küçük (geçmiş) olanları bul ve yok et
                    }
                }
            });

            if (result.count > 0) {
                console.log(`[CRON] ${result.count} adet süresi dolmuş doğrulama kodu temizlendi.`);
            }


        }catch (error) {
            console.error('[CRON] Doğrulama kodları süreleri kontrol edilirken bir hata oluştu:', error);
        }
    }

    sweepExpiredPendingVerifications()

    cron.schedule('*/5 * * * *', sweepExpiredPendingVerifications);
    console.log('[CRON] Sweeper servisi (Süresi Dolmuş Doğrulama kodları) başlatıldı ve ilk tarama yapılıyor.');




}