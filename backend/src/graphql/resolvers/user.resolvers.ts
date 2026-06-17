import { GraphQLContext } from "../context";
import { checkAuth } from "../guards";
import bcrypt from "bcryptjs";

export const userResolvers = {
    // REST'teki GET isteklerinin karşılığı (Veri çekme)
    Query: {
        getPublicProfile: async (_parent: any, args: { id: string }, context: GraphQLContext) => {
            const user = await context.prisma.user.findUnique({
                where: { id: args.id },
                select: {
                    id: true, username: true, name: true, surname: true,
                    profile_photo: true, university: true, rating_sum: true,
                    rating_count: true, createdAt: true
                }
            });

            if (!user) throw new Error("Kullanıcı bulunamadı");

            // İlan sayısını da ekliyoruz (Eski listingCount mantığı)
            const listing_count = await context.prisma.listing.count({
                where: { ownerId: args.id, status: "active" }
            });

            return { user, listing_count };
        }
    },

    // REST'teki POST, PATCH, DELETE isteklerinin karşılığı (Veri değiştirme)
    Mutation: {
        updateUser: async (_parent: any, args: { input: any }, context: GraphQLContext) => {
            // 1. Yetki Kontrolü (Eski authMiddleware yerine geçiyor)
            checkAuth(context);

            const { username, name, surname, password } = args.input;
            const updateData: any = {};

            if (name) updateData.name = name;
            if (surname) updateData.surname = surname;
            if (username) updateData.username = username;
            if (password) updateData.password = await bcrypt.hash(password, 12);

            // 2. Prisma ile Güncelleme
            const updatedUser = await context.prisma.user.update({
                where: { id: context.userId! },
                data: updateData
            });

            return updatedUser;
        }
    }
};