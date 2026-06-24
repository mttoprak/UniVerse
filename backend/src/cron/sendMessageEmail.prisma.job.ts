import cron from 'node-cron';
import { prisma } from "../graphql/context";
import { sendNewConversationEmail, sendNewOfferEmail, sendUnreadMessagesEmail } from "../utils/mail.utils";

export const startMessageEmailCron = () => {

    const sweepUnreadMessages = async () => {
        try {

            console.log('[CRON] Okunmamış Mesajlar kontrol ediliyor...');

            const time = new Date().toLocaleTimeString('tr-TR');
            // console.log(`[CRON] [${time}] 5 dakikadır okunmamış konuşmalar kontrol ediliyor...`);

            const fiveMinutesAgo = new Date(Date.now() - (5 * 60 * 1000));

            // 1. Sadece alıcı veya satıcı tarafında okunmamış mesajı olan "aktif" sohbetleri çekiyoruz
            // İlan, alıcı ve satıcı bilgilerini join (include) ile tek seferde alıyoruz
            const conversations = await prisma.conversation.findMany({
                where: {
                    status: 'active',
                    OR: [
                        { unreadSeller: { gt: 0 } },
                        { unreadBuyer: { gt: 0 } }
                    ]
                },
                include: {
                    listing: { select: { id: true, title: true } },
                    seller: { select: { id: true, email: true, name: true, surname: true, profile_photo: true, username: true } },
                    buyer: { select: { id: true, email: true, name: true, surname: true, profile_photo: true, username: true } }
                }
            });

            if (conversations.length === 0) return;

            let sentMailCount = 0;

            for (const convo of conversations) {
                // Prisma'da Json alanları için tip belirtiyoruz
                const lastMsg: any = convo.lastMessage;

                // 2. Mongoose'da Query içinde yaptığımız filtrelemeyi burada yapıyoruz
                if (!lastMsg || lastMsg.isRead || lastMsg.emailNotified || lastMsg.type?.toLowerCase() !== 'user') {
                    continue;
                }

                // Mesaj 5 dakikadan daha yeni ise henüz mail atma (bir sonraki taramayı bekle)
                if (new Date(lastMsg.sentAt) > fiveMinutesAgo) {
                    continue;
                }

                // 3. Gönderen ve Alıcıyı tespit et
                const isSenderSeller = (lastMsg.senderId === convo.sellerId);
                const senderUser = isSenderSeller ? convo.seller : convo.buyer;
                const getterUser = isSenderSeller ? convo.buyer : convo.seller;

                if (!getterUser?.email || !senderUser || !convo.listing) continue;

                // 4. Okunmamış detay mesajları çek
                const unreadMessages = await prisma.message.findMany({
                    where: {
                        conversationId: convo.id,
                        isRead: false,
                        senderId: lastMsg.senderId
                    },
                    orderBy: { createdAt: 'asc' }
                });

                if (unreadMessages.length === 0) continue;

                // 5. Gönderilecek mail tipini belirle
                let emailType = 'unread_messages';
                if (convo.offerStatus === 'Offer Sent') {
                    emailType = 'new_offer';
                } else {
                    const totalMessageCount = await prisma.message.count({ where: { conversationId: convo.id } });
                    if (unreadMessages.length === totalMessageCount) {
                        emailType = 'new_conversation';
                    }
                }

                // 6. İlgili maili fırlat
                if (emailType === 'new_offer') {
                    await sendNewOfferEmail(getterUser.email, senderUser, convo.listing, unreadMessages);
                } else if (emailType === 'new_conversation') {
                    await sendNewConversationEmail(getterUser.email, senderUser, convo.listing, unreadMessages);
                } else {
                    await sendUnreadMessagesEmail(getterUser.email, senderUser, convo.listing, unreadMessages);
                }

                // 7. Sohbeti "Mail atıldı" olarak güncelle
                lastMsg.emailNotified = true;
                await prisma.conversation.update({
                    where: { id: convo.id },
                    data: { lastMessage: lastMsg }
                });

                sentMailCount++;
            }

            if (sentMailCount > 0) {
                console.log(`[CRON] ${sentMailCount} kullanıcıya okunmamış mesaj e-postası başarıyla gönderildi! 🚀`);
            }
            else{
                console.log(`[CRON] Okunmamış mesaj bulunamadı.`);
            }

        } catch (error) {
            console.error('[CRON] Okunmamış mesaj mail kontrolü sırasında bir hata oluştu:', error);
        }
    }

    // İlk taramayı başlat
    sweepUnreadMessages();

    // 5 dakikada bir çalışacak döngüyü kur
    cron.schedule('*/5 * * * *', sweepUnreadMessages);
    console.log('[CRON] Sweeper servisi (Okunmamış Mesaj Mailleri) başlatıldı ve ilk tarama yapılıyor.');
};