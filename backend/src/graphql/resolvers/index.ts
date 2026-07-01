import { userResolvers      } from "./user.resolvers";
import { authResolvers      } from "./auth.resolvers";
import { listingResolvers   } from "./listing.resolvers";
import { messagingResolvers } from "./messaging.resolvers";
import { commentResolvers   } from "./comment.resolvers";
import { adminResolvers     } from "./admin.resolvers";
import { miscResolvers      } from "./misc.resolvers";

export const resolvers = [
    userResolvers,
    authResolvers,
    listingResolvers,
    messagingResolvers,
    commentResolvers,
    adminResolvers,
    miscResolvers
];