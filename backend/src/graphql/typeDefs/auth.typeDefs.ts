export const authTypeDefs = `#graphql
type AuthResponse {
    token: String!
    is_complete: Boolean!
    user: User
}

type VerificationResponse {
    success: Boolean!
    message: String!
}

input RegisterInput {
    email: String!
    name: String!
    surname: String!
    password: String!
    account_type: AccountType!
    code: String!
}

input LoginInput {
    email: String!
    password: String!
}

input CompleteProfileInput {
    username: String!
    edu_email: String
    university: String
    birthdate: String
    password: String
}

# ─── ŞİFRE SIFIRLAMA GİRDİLERİ ───
input ForgotPasswordInput {
    usernameOrEmail: String!
}

input VerifyResetCodeInput {
    email: String!
    code: String!
}

input ResetPasswordInput {
    email: String!
    code: String!
    password: String!
}

type Mutation {
    # 1. Aşama: Mail gönder
    sendVerification(email: String!): VerificationResponse!

    # 2. Aşama: Kodu doğrula ve kayıt ol
    register(input: RegisterInput!): AuthResponse!

    # Normal Giriş
    login(input: LoginInput!): AuthResponse!

    completeProfile(input: CompleteProfileInput!): AuthResponse!
    
    forgotPassword(input: ForgotPasswordInput!): VerificationResponse!
    
    verifyResetCode(input: VerifyResetCodeInput!): VerificationResponse!
    
    resetPassword(input: ResetPasswordInput!): AuthResponse!
    
}
`;