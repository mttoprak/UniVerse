import { GraphQLContext } from "./context";

export const checkAuth = (context: GraphQLContext) => {
    if (!context.userId || !context.user) {
        throw new Error("UNAUTHORIZED: Giriş yapmanız gerekmektedir.");
    }
    if (context.tokenType === "temp") {
        throw new Error("FORBIDDEN: Profil tamamlama sürecini bitirmelisiniz.");
    }
    if (context.user.is_banned) {
        throw new Error("FORBIDDEN: Hesabınız askıya alınmıştır.");
    }
};

export const checkStudentOnly = (context: GraphQLContext) => {
    checkAuth(context);
    if (context.user?.account_type !== "student") {
        throw new Error("FORBIDDEN: Bu işleme sadece üniversite öğrencileri yetkilidir.");
    }
};