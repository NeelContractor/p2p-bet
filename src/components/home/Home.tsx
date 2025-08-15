"use client"

import { useProfile } from "@/hooks/useProfile";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";

export interface ChatBet {
    betTitle: string,
    betPubKey: string
}

export default function Home() {
    const { connected, publicKey } = useWallet();
    const [bets, setBets] = useState<ChatBet[]>([]);
    const { profile, error, loading } = useProfile();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === "development") ? "http://localhost:3000" : ""; // TODO add url

    useEffect(() => {
        async function fetchBets() {
            const response = await fetch(`${baseUrl}/api/getAllBets`, {
                method: "POST",
                headers: {
                    'Content-Type': "application/json",
                },
                body: JSON.stringify({
                    userAddress: publicKey?.toBase58() || "",
                }),
            })
            const bets = await response.json();
            setBets(bets);
        }
        fetchBets();
    }, [publicKey]);

    if (!connected) {
        return (
            <div className="flex-1 w-full flex items-center justify-center">
                <p className="text-lg text-muted-foreground">Please connect your wallet to start betting.</p>
            </div>
        )
    }

    const userId = profile?.id?.toString() || "";

    return <div className="flex h-screen">
        <div className="flex-1 overflow-hidden">
            {userId && initialMessages.lenght > 0 && bets && bets.length > 0 && (
                <PublicChat userId={userId} initialMessages={initialMessages} bets={bets} />
            )}
        </div>
    </div>
}