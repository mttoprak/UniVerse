import { createClient, Client } from 'graphql-ws';

let sharedWsClient: Client | null = null;

export function getWsClient(): Client | null {
    if (typeof window === 'undefined') return null;

    // Eğer halihazırda açık bir client varsa onu dön
    if (sharedWsClient) return sharedWsClient;

    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const cleanApiUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    const wsUrl = cleanApiUrl.replace(/^http/, 'ws') + '/graphql';

    // Yoksa yeni bir tane oluştur ve kaydet
    sharedWsClient = createClient({
        url: wsUrl,
        connectionParams: { Authorization: `Bearer ${token}` },
        on: {
            // connected: () => console.log('GraphQL WS: Bağlantı Başarılı'),
            error: (err) => console.log('GraphQL WS Hatası:', err),
        }
    });

    return sharedWsClient;
}