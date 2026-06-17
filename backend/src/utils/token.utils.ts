/*
 * In token.utils.ts we define the expire-time of auth types,
 * sing Full-access or Temp-access jwt  verify the tokens with verifyToken().
 *
 */


import * as jwt from "jsonwebtoken" // "* as" is a statement that gets everything in the imported library

const JWT_SECRET = process.env.JWT_SECRET! // exclamation mark ("!") in the end of the
// code line restricts this model as a guaranteed stated stable type

interface TokenPayload {
    userId: string
    type: "access" | "temp"  // temp means the registration isn't complete.
}

// Full-access — 32 Days.
// We can discuss the time for this later.
export const signTempToken = (userId: string) => {
    return jwt.sign(
        { userId, type: "temp" },
        process.env.JWT_TEMP_SECRET || "yedek_temp_gizli_anahtar",
        { expiresIn: "15m" } // Temp token genelde kısa sürelidir
    );
};

export const signAccessToken = (userId: string) => {
    return jwt.sign(
        { userId, type: "access" },
        process.env.JWT_SECRET || "yedek_access_gizli_anahtar",
        { expiresIn: "7d" }
    );
};

export const verifyToken = (token: string): TokenPayload =>
    jwt.verify(token, JWT_SECRET) as TokenPayload