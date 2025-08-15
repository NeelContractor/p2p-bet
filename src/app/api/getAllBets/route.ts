/* eslint-disable @typescript-eslint/no-unused-vars */

import { useBetProgram } from "@/components/bet/bet-data-access";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { userAddress } = await req.json();
        const userPubkey = new PublicKey(userAddress);
        const { connection } = useConnection();
        const { program } = useBetProgram();
        
        const allChatBets = await program.account.bet.all();

        const bets = await Promise.all(allChatBets.map(async(b) => {
            const title = b.account.title;
            const betPubkey = b.publicKey.toBase58();
            return {
                betTitle: title,
                betPubkey: betPubkey
            }
        }))

        return NextResponse.json(bets, { status: 200 });
    } catch (err) {
        if (err instanceof Error) {
            return NextResponse.json({ error: err.message }, { status: 500 });
        }
        return NextResponse.json({ error: "Unable to find Bets for given User" }, { status: 500 });
    }
}