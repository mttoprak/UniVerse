import { z } from "zod"

export const localRegisterSchema = z.object({
    email:        z.email(),
    password:     z.string().min(8),
    name:         z.string().min(2),
    surname:      z.string().min(2),
    account_type: z.enum(["student", "external"]),
    code:         z.string().length(6).regex(/^\d{6}$/),  // email
})

export const completeProfileSchema = z.object({
    account_type: z.enum(["student", "external"]),

    username:  z.string()
        .min(3).max(30)
        .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers and _ can be used"),

    edu_email: z.email()
        .refine(val => val.endsWith(".edu.tr"), {
            message: "University emails have to end with '.edu.tr' "
        })
        .optional(),

    birthdate: z.coerce.date().optional(),// in "1990-01-15" format

    university: z.string().optional(),

    // This is optional for only users who auth with Google
    password: z.string().min(8).optional(),

}).superRefine((data, ctx) => {
    //If account type is student, username is required!
    if (data.account_type === "student" && !data.university) {
        ctx.addIssue({
            code: "custom",
            path: ["university"],
            message: "university is required for students",
        })
    }

    // If account type is student, the edu mail is required!
    if (data.account_type === "student" && !data.edu_email) {
        ctx.addIssue({
            code: "custom",
            path: ["edu_email"],
            message: "Edu emails is required for students",
        })
    }

    if (data.account_type === "external" && data.edu_email) {
        ctx.addIssue({
            code: "custom",
            path: ["edu_email"],
            message: "External users cannot write Edu E-mail",
        })
    }

    if (data.account_type === "external" && data.university) {
        ctx.addIssue({
            code: "custom",
            path: ["university"],
            message: "External users cannot write University",
        })
    }


})

export const loginSchema = z.object({
    email:    z.email(),
    password: z.string(),
})

export const sendVerificationSchema = z.object({
    email: z.email(),
})

export const localRegisterValidationSchema = z.object({
    email:        z.email(),
    password:     z.string().min(8),
    name:         z.string().min(2),
    surname:      z.string().min(2),
    account_type: z.enum(["student", "external"])
})

export const sendEduVerificationSchema = z.object({
    code:         z.string().length(6).regex(/^\d{6}$/),  // email
})