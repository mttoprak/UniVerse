export interface OnlineUserData {
    ip: string;
    connectedAt: string;
    connectionsCount: number; // Birden fazla sekme açarsa sayısını tutacağız
}

export const onlineUsersMap = new Map<string, OnlineUserData>();