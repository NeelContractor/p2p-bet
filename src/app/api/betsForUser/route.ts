/* eslint-disable @typescript-eslint/no-unused-vars */
import { useBetProgram } from "@/components/bet/bet-data-access";
import * as anchor from "@coral-xyz/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { error } from "console";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { program } = useBetProgram();
        const { userAddress } = await req.json();
        const userPubkey = new PublicKey(userAddress);
        const { connection } = useConnection();
        const wallet = { publicKey: userPubkey } as anchor.Wallet;

        const allUserBets = (await program.account.userBet.all()).map(acc => acc.account);
        const betsForGivenUser = allUserBets.filter(userBet => userBet.user.toBase58() == userPubkey.toBase58())

        const bets = await Promise.all(betsForGivenUser.map(async(b) => {
            const bet = await program.account.bet.fetch(b.bet);
            const betTitle = bet.title;
            const betAmount = bet.betAmount;
            const isResolved = bet.resolved;
            const finalOutcome = bet.outcome;
            const yesBettors = bet.yesBettors.toNumber();
            const noBettors = bet.noBettors.toNumber();
            const resolutionDate = bet.endTime.toNumber();
            const totalYes = bet.totalYesAmount.toNumber();
            const totalNo = bet.totalNoAmount.toNumber();
            const tokenMint = bet.tokenMint;
            const decimals = 9;
            const finalBetAmount = (betAmount.toNumber()/(10 ** decimals));
            const side = b.direction == true ? "YES" : "NO";
            return {
                betTitle: betTitle,
                betAmount: finalBetAmount,
                isResolved: isResolved,
                side: side,
                finalOutcome: finalOutcome,
                totalYes: totalYes,
                totalNo: totalNo,
                betResolutionDateInEpochTime: resolutionDate,
                yesBettors: yesBettors,
                noBettors: noBettors,
            }
        }))

        return NextResponse.json(bets, { status: 200 });
    } catch (err) {
        if (err instanceof Error) {
            return NextResponse.json({ error: err.message }, { status: 500 });
        }
        return NextResponse.json({ error: "Unable to find bets for given user" }, { status: 500 });
    }
}