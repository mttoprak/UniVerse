import { userResolvers } from "./user.resolvers";
import {authResolvers} from "./auth.resolvers";
// import { listingResolvers } from "./listing.resolvers";
// import { offerResolvers } from "./offer.resolvers";

// Bütün parçaları bir dizi içine koyuyoruz.
// Apollo Server arka planda bunların hepsini zekice tek bir devasa objede birleştirecek.
export const resolvers = [
    userResolvers,
    authResolvers,
    // listingResolvers,
    // offerResolvers
];