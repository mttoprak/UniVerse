import { userResolvers } from "./user.resolvers";
// import { listingResolvers } from "./listing.resolvers";
// import { offerResolvers } from "./offer.resolvers";

// Bütün parçaları bir dizi içine koyuyoruz.
// Apollo Server arka planda bunların hepsini zekice tek bir devasa objede birleştirecek.
export const resolvers = [
    userResolvers,
    // listingResolvers,
    // offerResolvers
];