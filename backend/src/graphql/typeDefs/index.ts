import { userTypeDefs } from "./user.typeDefs";
import {listingTypeDefs} from "./listing.typeDefs";
// import { messageTypeDefs } from "./message.typeDefs";

// İleride açacağın tüm dosyaları buraya ekleyeceksin.
// Apollo bu diziyi görünce "Tamam, ben bunları arkada birleştiririm" diyecek.
export const typeDefs = [
    userTypeDefs,
    listingTypeDefs
    // listingTypeDefs,
    // messageTypeDefs
];