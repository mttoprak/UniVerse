import { Resend } from "resend"


const resend = new Resend(process.env.RESEND_API_KEY)

export const sendVerificationEmail = async (email: string, code: string) => {
    const { data, error } = await resend.emails.send({
        from: "Universe <no-reply@mttoprak.dev>",
        to: email,
        subject: "Email Verification",
        html: `<p>Your verification code: <strong>${code}</strong></p><p>Expires in 10 minutes.</p>`
    })
    if (error) {
        return error;
    }
    return data;

}


export const sendVerificationEduEmail = async (email: string, code: string) => {
    const {data, error} = await resend.emails.send({
        from: "Universe <no-reply@mttoprak.dev>",
        to: email,
        subject: "Email Verification",
        html: `<p>Your verification code: <strong>${code}</strong></p><p>Expires in 10 minutes.</p>`
    })
    if (error) {
        return error;
    }
    return data;

}

export const sendPasswordResetEmail = async (email: string, code: string) => {
    const { data, error } = await resend.emails.send({
        from: "Universe <no-reply@mttoprak.dev>",
        to: email,
        subject: "Password Reset Code",
        html: `<p>Your password reset code: <strong>${code}</strong></p><p>Expires in 15 minutes.</p>`
    })
    if (error) {
        return error;
    }
    return data;
}


export const sendNewOfferEmail = async (email: string, senderUser: any, listingInfo: any, unreadMessages: any[]) => {
    // Son mesajı veya ilk mesajı önizleme olarak alıyoruz
    const latestMessageText = unreadMessages[unreadMessages.length - 1]?.text || 'Sana bir teklif gönderildi.';

    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eaeaea; border-radius: 10px; overflow: hidden;">
            <div style="background-color: #4F46E5; padding: 20px; text-align: center;">
                <h2 style="color: #ffffff; margin: 0;">Yeni Bir Teklifin Var! 🎉</h2>
            </div>
            <div style="padding: 20px; background-color: #ffffff; color: #333333;">
                <p style="font-size: 16px;">Merhaba,</p>
                <p style="font-size: 16px;"><strong>${senderUser.name} ${senderUser.surname}</strong> (@${senderUser.username}) adlı kullanıcı, <strong>"${listingInfo.title}"</strong> başlıklı ilanına yeni bir teklif gönderdi.</p>
                
                <div style="background-color: #f9fafb; border-left: 4px solid #4F46E5; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; font-style: italic; color: #4b5563;">"${latestMessageText}"</p>
                </div>
                
                <p style="font-size: 16px;">Teklifi değerlendirmek ve cevap vermek için hemen UniVerse'e giriş yap.</p>
                
                <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
                    <a href="https://universe.mttoprak.dev/messages" style="background-color: #4F46E5; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Teklifi Görüntüle</a>
                </div>
            </div>
        </div>
    `;

    const { data, error } = await resend.emails.send({
        from: "UniVerse <no-reply@mttoprak.dev>",
        to: email,
        subject: `Yeni Teklif: ${listingInfo.title}`,
        html: html
    });

    if (error) return error;
    return data;
};


export const sendNewConversationEmail = async (email: string, senderUser: any, listingInfo: any, unreadMessages: any[]) => {
    // Yeni sohbetteki mesajları listelemek için HTML oluşturuyoruz
    const messagesHtml = unreadMessages.map(msg => `
        <div style="background-color: #f3f4f6; padding: 10px 15px; margin-bottom: 10px; border-radius: 8px;">
            <p style="margin: 0; color: #1f2937;">${msg.text}</p>
        </div>
    `).join('');

    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eaeaea; border-radius: 10px; overflow: hidden;">
            <div style="background-color: #10B981; padding: 20px; text-align: center;">
                <h2 style="color: #ffffff; margin: 0;">İlanın İçin Yeni Bir Mesaj! 💬</h2>
            </div>
            <div style="padding: 20px; background-color: #ffffff; color: #333333;">
                <p style="font-size: 16px;"><strong>${senderUser.name} ${senderUser.surname}</strong> (@${senderUser.username}), <strong>"${listingInfo.title}"</strong> başlıklı ilanın hakkında seninle iletişime geçti.</p>
                
                <div style="margin: 20px 0;">
                    ${messagesHtml}
                </div>
                
                <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
                    <a href="https://universe.mttoprak.dev/messages" style="background-color: #10B981; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Mesaja Cevap Ver</a>
                </div>
            </div>
        </div>
    `;

    const { data, error } = await resend.emails.send({
        from: "UniVerse <no-reply@mttoprak.dev>",
        to: email,
        subject: `Yeni Mesaj: ${listingInfo.title}`,
        html: html
    });

    if (error) return error;
    return data;
};


export const sendUnreadMessagesEmail = async (email: string, senderUser: any, listingInfo: any, unreadMessages: any[]) => {
    const messageCount = unreadMessages.length;

    // Eğer adam 8 tane mesaj attıysa hepsini mailde göstermek çirkin durur. Son 3 mesajı alıyoruz.
    const recentMessages = unreadMessages.slice(-3);
    const hiddenCount = messageCount - recentMessages.length;

    let messagesHtml = recentMessages.map(msg => `
        <div style="background-color: #f9fafb; border-left: 3px solid #6366f1; padding: 10px 15px; margin-bottom: 10px; border-radius: 4px;">
            <p style="margin: 0; color: #374151;">${msg.text}</p>
        </div>
    `).join('');

    if (hiddenCount > 0) {
        messagesHtml += `<p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 10px;">+ ${hiddenCount} yeni mesaj daha...</p>`;
    }

    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eaeaea; border-radius: 10px; overflow: hidden;">
            <div style="background-color: #3B82F6; padding: 20px; text-align: center;">
                <h2 style="color: #ffffff; margin: 0;">Okunmamış Mesajların Var 📬</h2>
            </div>
            <div style="padding: 20px; background-color: #ffffff; color: #333333;">
                <p style="font-size: 16px;"><strong>${senderUser.name} ${senderUser.surname}</strong> (@${senderUser.username}) sana <strong>"${listingInfo.title}"</strong> ilanı hakkında <strong>${messageCount} yeni mesaj</strong> gönderdi.</p>
                
                <div style="margin: 20px 0;">
                    ${messagesHtml}
                </div>
                
                <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
                    <a href="https://universe.mttoprak.dev/messages" style="background-color: #3B82F6; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Sohbete Git</a>
                </div>
            </div>
        </div>
    `;

    const { data, error } = await resend.emails.send({
        from: "UniVerse <no-reply@mttoprak.dev>",
        to: email,
        subject: `${senderUser.name} sana ${messageCount} yeni mesaj gönderdi`,
        html: html
    });

    if (error) return error;
    return data;
};