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
