"use client";

import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const httpLink = new HttpLink({
    uri: `${API_URL}/graphql`,
});

const authLink = new SetContextLink((prevContext) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return {
        headers: {
            ...prevContext.headers,
            authorization: token ? `Bearer ${token}` : "",
        }
    };
});

export const apolloClient = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
});