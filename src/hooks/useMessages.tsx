import { User } from "@prisma/client";
import { useEffect, useState } from "react";

export interface Message {
    id: string | number,
    content: string  | null,
    sender: User | null, // Prisma client User 
    senderId: string | null,
    timestamp: string | null,
    isAgent: boolean | null,
}

interface UserChatMessagesResult {
    initialMessages: Message[] | null,
    loading: boolean,
    error: Error | null,
    refetch: () => Promise<void>;
}

export function useChatMessages(chatId?: string): UserChatMessagesResult {
    const [initialMessages, setInitialMessages] = useState<Message[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<null | Error>(null);

    async function fetchChatMessages() {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/getMessages", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) {
                throw new Error("Failed to fetch chat messages");
            }

            const messages = await res.json();

            const sortMessages = messages.sort((a: Message, b: Message) => 
                Number(b.timestamp) - Number(a.timestamp)
            );

            setInitialMessages(sortMessages);
            setLoading(false);
        } catch (err) {
            setError(err instanceof Error ? err : new Error("An unknown error occurred"));
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchChatMessages();
    }, [chatId]);

    return {
        initialMessages,
        loading,
        error,
        refetch: fetchChatMessages
    }
}