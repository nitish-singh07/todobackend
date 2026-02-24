export interface User {
    id: string;
    email: string;
    name?: string;
    photo?: string;
    provider: string;
    provider_id: string;
    created_at?: string;
}

export interface Todo {
    id: string;
    title: string;
    description?: string;
    completed: boolean;
    deleted: boolean;
    client_updated_at: string;
}

export interface JWTPayload {
    userId: string;
}
