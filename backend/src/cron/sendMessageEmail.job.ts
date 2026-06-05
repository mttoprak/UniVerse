import cron from 'node-cron';
import Conversation from "../models/Conversation";
import Message from "../models/Message";
import User from "../models/User";
import {Listing} from "../models/Listing";
import {sendNewConversationEmail, sendNewOfferEmail, sendUnreadMessagesEmail} from "../utils/mail.utils";
// import {sendNewOfferEmail} from "../utils/mail.utils";
// import { sendNewOfferEmail, sendNewConversationEmail, sendUnreadMessagesEmail } from "../utils/emailUtils";

export const startMessageEmailCron = () => {

    const sendMessageEmail = async () => {
        const time = new Date().toLocaleTimeString('tr-TR');
        console.log(`[CRON] [${time}] 5 dakikadır okunmamış konuşmalar kontrol ediliyor...`);

        try {
            const fiveMinutesAgo = new Date(Date.now() - (5 * 60 * 1000));

            // 1. FİLTRE: Sistem mesajları elendi ('user') ve İLAN (Listing) populate edildi.
            // NOT: İlanın başlık alanının adı veritabanında 'title' ise aşağısı doğru. Değilse ('name' vb.) değiştir.
            const conversations = await Conversation.find({
                'lastMessage.sentAt': {$lte: fiveMinutesAgo},
                'lastMessage.isRead': false,
                'lastMessage.emailNotified': {$ne: true},
                'lastMessage.type': 'User' // Sadece kullanıcıların yazdığı mesajlar tetikler
            })
            console.log(fiveMinutesAgo);

            if (!conversations || conversations.length === 0) {
                console.log('[CRON] Okunmamış mesajlar servisi kontrol edildi ve işlem yapılacak sohbet bulunamadı.');
                return;
            }

            console.log(conversations +"deneme");


            let sentMailCount = 0;

            for (const convo of conversations) {//ddd
                if (!convo.lastMessage) continue;

                const senderId = convo.lastMessage.senderId.toString();
                const sellerId = convo.seller.toString();
                const getterId = (senderId === sellerId) ? convo.buyer : convo.seller;
                const listingId = convo.listing.toString(); // İlanın ID'sini aldık

                // 2. ALICI, GÖNDEREN VE İLAN BİLGİSİNİ AYRI AYRI VE PARALEL ÇEKİYORUZ
                const [getterUser, senderUser, listingInfo] = await Promise.all([
                    User.findById(getterId).select('email'),
                    User.findById(senderId).select('username name surname profile_photo'),
                    Listing.findById(listingId).select('title') // Eğer sendeki ilan adı alanı 'title' değil de 'name' ise burayı değiştir
                ]);

                if (!getterUser || !getterUser.email || !senderUser || !listingInfo) {
                    console.log(`[DEBUG] Alıcı (${getterId}), Gönderen (${senderId}) veya İlan (${listingId}) eksik !`);
                    continue;
                }

                // 3. Mesajları çek
                const unreadMessages = await Message.find({
                    conversation: convo._id, // <--- conversationId yerine conversation yazdık!
                    isRead: false
                }).sort({createdAt: 1});

                if (unreadMessages.length === 0) {
                    console.log(`[DEBUG] Konuşma ID: ${convo._id} için Message tablosunda mesaj bulunamadı!`);
                    continue;
                }

                // 4. MAİL TİPİNİ BELİRLEME
                let emailType = 'unread_messages';

                if (convo.offerStatus === 'Offer Sent') {
                    emailType = 'new_offer';
                } else {
                    const totalMessageCount = await Message.countDocuments({conversationId: convo._id});
                    if (unreadMessages.length === totalMessageCount) {
                        emailType = 'new_conversation';
                    }
                }

                // 5. EMAİLİ GÖNDERME
                // Artık elimizde tertemiz ve typesafe bir listingInfo.title var!

                if (emailType === 'new_offer') {
                    console.log(`[CRON] ${getterUser.email} adresine YENİ TEKLİF maili gönderildi! (Gönderen: ${senderUser.name}, İlan: ${listingInfo.title})`);
                    await sendNewOfferEmail(getterUser.email, senderUser, listingInfo, unreadMessages);
                    // console.log(getterUser.email, senderUser, listingInfo, unreadMessages)

                } else if (emailType === 'new_conversation') {
                    console.log(`[CRON] ${getterUser.email} adresine YENİ SOHBET maili gönderildi! (Gönderen: ${senderUser.name}, İlan: ${listingInfo.title})`);
                    await sendNewConversationEmail(getterUser.email, senderUser, listingInfo, unreadMessages);

                } else {
                    console.log(`[CRON] ${getterUser.email} adresine ${unreadMessages.length} OKUNMAMIŞ MESAJ maili gönderildi! (Gönderen: ${senderUser.name}, İlan: ${listingInfo.title})`);
                    await sendUnreadMessagesEmail(getterUser.email, senderUser, listingInfo, unreadMessages);
                }

                // 6. KLASİK KAYDETME
                convo.lastMessage.emailNotified = true;
                await convo.save();

                sentMailCount++;
            }

            // RAPORLAMA
            if (sentMailCount === 0) {
                console.log(`[CRON] Tarama yapıldı ancak eksik veri nedeniyle mail atılmadı.`);
            } else {
                console.log(`[CRON] Tarama tamamlandı. Toplam ${sentMailCount} kullanıcıya başarıyla mail gönderildi! 🚀`);
            }

        } catch (error) {
            console.error('[CRON] Mail gönderim sırasında bir hata oluştu:', error);
        }
    }

    // 1. Sunucu ayağa kalkar kalkmaz hemen BİR KERE Email kontrolü yap
    sendMessageEmail();

    // 2. Ardından her 5 dakikada bir çalışmaya devam etmesi için cron kur
    cron.schedule('*/5 * * * *', sendMessageEmail);

    console.log('[CRON] Send Message Email servisi başlatıldı ve ilk tarama yapılıyor.');
};




