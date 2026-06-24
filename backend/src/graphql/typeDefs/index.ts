import { userTypeDefs } from "./user.typeDefs";
import { listingTypeDefs } from "./listing.typeDefs";
import { authTypeDefs } from "./auth.typeDefs";
import { messagingTypeDefs } from "./messaging.typeDefs";
import { commentTypeDefs } from "./comment.typeDefs";
// import { messageTypeDefs } from "./message.typeDefs";

export const typeDefs = [
    userTypeDefs,
    authTypeDefs,
    listingTypeDefs,
    messagingTypeDefs,
    commentTypeDefs,
    // listingTypeDefs,
    // messageTypeDefs
];