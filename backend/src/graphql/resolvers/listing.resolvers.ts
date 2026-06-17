import { z } from "zod";
import { createActivityLog } from "../../utils/logger.util";
import {GraphQLContext} from "../context";

export const listingResolvers = {
    Query:{

        getMyListings: async (_parent: any, args: { input: any }, context: GraphQLContext) => {

        },

        getListings: async (_parent: any, args: { input: any }, context: GraphQLContext) => {

        },

        getFeedListings: async (_parent: any, args: { input: any }, context: GraphQLContext) => {

        },

        getUrgentListings: async (_parent: any, args: { input: any }, context: GraphQLContext) => {

        },

        getUserListings: async (_parent: any, args: { input: any }, context: GraphQLContext) => {

        },

        getListing: async (_parent: any, args: { input: any }, context: GraphQLContext) => {

        },

    },
    Mutation: {

        createListing: async (_parent: any, args: { input: any }, context: GraphQLContext) => {

        },

        updateListing: async (_parent: any, args: { id: any }, context: GraphQLContext) => {

        },

        deleteListing: async (_parent: any, args: { id: any }, context: GraphQLContext) => {

        },

        republishListing: async (_parent: any, args: { id: any }, context: GraphQLContext) => {

        },

    },
}