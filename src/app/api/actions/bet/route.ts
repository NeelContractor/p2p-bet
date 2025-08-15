/* eslint-disable @typescript-eslint/no-unused-vars */
import * as anchor from "@coral-xyz/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { useBetProgram } from "../../../../components/bet/bet-data-access";
import { ActionGetResponse, ActionPostRequest, ActionPostResponse, ACTIONS_CORS_HEADERS, createPostResponse } from "@solana/actions";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

export function getOrdinalSuffix(day: number): string {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
  }

export function formatTimestamp(epochTimestamp: number): string {
    const date = new Date(epochTimestamp * 1000);
    
    const day = date.getDate();
    const ordinal = getOrdinalSuffix(day);
    
    return `${day}${ordinal} ${date.toLocaleString('default', { month: 'long' })}, ${date.getFullYear()}`;
  }

export const GET = async (req: Request) => {
    const { program } = useBetProgram();
    const requestUrl = new URL(req.url as string);

    const { connection } = useConnection();
    const wallet = { publicKey: new PublicKey("GToMxgF4JcNn8dmNiHt2JrrvLaW6S1zSPoL2W8K2Wkmi") } as anchor.Wallet;
    const betAccountKey = new PublicKey(betAccountId!);
    const betAccountInfo = await program.account.bet.fetch(betAccountKey, "confirmed");
    const betTitle = betAccountInfo.title;
    const betAmount = betAccountInfo.betAmount.toNumber()/(10**9);
    const isBetResolved = betAccountInfo.resolved;
    const betResolutionDateInEpochTimestamp = betAccountInfo.endTime.toNumber(); // Format time
    const betResolutionDate = formatTimestamp(betResolutionDateInEpochTimestamp);

    const sampleImages = ["", "", ""]; // upload few image for blink 
    const imageUrl = sampleImages[Math.floor(Math.random()*4)];

    let payload: ActionGetResponse = {
        title: betTitle,
        icon: "https://ucarecdn.com/7aa46c85-08a4-4bc7-9376-88ec48bb1f43/-/preview/880x864/-/quality/smart/-/format/auto/",
        description: `Bet Resolves on ${betResolutionDate}`,
        label: "Bet",
        links: {
            actions: [
                {
                    label: `$${betAmount} YES`,
                    type: 'post',
                    href: `/api/actions/bet?betId=${betAccountId}&side=YES&action=placeBet`,
                },
                {
                    label: `$${betAmount} NO`,
                    type: "post",
                    href: `/api/actions/bet?betId=${betAccountId}&side=NO&action=placeBet`,
                },
            ]
        }
    };

    if (isBetResolved) {
        payload = {
            title: betTitle,
            icon: 'https://ucarecdn.com/7aa46c85-08a4-4bc7-9376-88ec48bb1f43/-/preview/880x864/-/quality/smart/-/format/auto/',
            description: `Claim Win/Check Loss`,
            label: "Bet",
            links: {
                actions: [
                    {
                        label: "Claim",
                        type: "post",
                        href: `/api/actions/bet?betId=${betAccountId}&action=claim`,
                    },
                ],
            },
        };
    }

    return Response.json(payload, {
        headers: ACTIONS_CORS_HEADERS,
    });
}

export const POST = async(req: Request) => {
    try {
        const { program } = useBetProgram();
        const requestUrl = new URL(req.url);
        const { action, betId } = checkAction(requestUrl);
        const body: ActionPostRequest = await req.json();
        const bettorAccount = new PublicKey(body.account);

        const betAccountKey = new PublicKey(betId!);

        const { connection } = useConnection();
        const wallet = { publicKey: bettorAccount } as anchor.Wallet;
        const betAccountInfo = await program.account.bet.fetch(betAccountKey, "confirmed");
        const tokenMint = betAccountInfo.tokenMint;
        const betResolutionDateInEpochTimestamp = betAccountInfo.endTime.toNumber();

        const [vaultTokenAccount] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault_token_account"), betAccountKey.toBuffer()],
            program.programId
        );
        const bettorTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            bettorAccount,
            true
        );
        const [userBet] = PublicKey.findProgramAddressSync(
            [Buffer.from("user_bet"), betAccountKey.toBuffer(), bettorAccount.toBuffer()],
            program.programId
        );

        if (action == 'placeBet') {
            const { side } = checkSide(requestUrl);
            let betDirection = false;
            if (side) {
                betDirection = side === "YES" ? true : false;
            }

            const ixn = await program.methods
                .placeBet(betDirection)
                .accountsStrict({
                    bettor: bettorAccount, //
                    bet: betAccountKey,
                    userBet: userBet,
                    bettorTokenAccount: bettorTokenAccount,
                    vaultTokenAccount: vaultTokenAccount,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .instruction()

                const tx = new VersionedTransaction(new TransactionMessage({
                    payerKey: bettorAccount,
                    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
                    instructions: [ixn],
                }).compileToV0Message());

                await prisma.user.updateMany({
                    where: {
                        walletPublicKey: bettorAccount.toBase58(),
                    },
                    data: {
                        betAmount: betAccountInfo.betAmount.toNumber().toString(),
                    }
                })

                const payload: ActionPostResponse = await createPostResponse({
                    fields: {
                        transaction: tx,
                        type: "transaction",
                        message: `Successfully Placed bet for side ${side!}`,
                    },
                });

                return Response.json(payload, {
                    headers: ACTIONS_CORS_HEADERS,
                });
        } else if(action == "cliam") {
            const claimIxn = await program.methods
                .claimWinnings()
                .accounts({
                    bet: betAccountKey,
                    user: bettorAccount,
                    vaultTokenAccount: vaultTokenAccount,
                    userTokenAccount: bettorTokenAccount
                }).instruction()

                const tx = new VersionedTransaction(new TransactionMessage({
                    payerKey: bettorAccount,
                    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
                    instructions: [claimIxn],
                }).compileToV0Message());

                const payload: ActionPostResponse = await createPostResponse({
                    fields: {
                        transaction: tx,
                        type: "transaction",
                        message: `Successfully Claimed`
                    }
                });

                return Response.json(payload, {
                    headers: ACTIONS_CORS_HEADERS
                });
        } 
    } catch(err) {
        console.log(err);
        let message = 'An unknown error occurred';
        if (typeof err == 'string') message = err;
        return new Response(JSON.stringify(message), {
            status: 400,
            headers: ACTIONS_CORS_HEADERS,
        });
    }
}

export const OPTIONS = async (req: Request) => {
    return new Response(null, {
        status: 204,
        headers: ACTIONS_CORS_HEADERS
    });
};

function checkSide(requestUrl: URL) {
    let side;
    try {
        if (requestUrl.searchParams.get("side")) {
            side = requestUrl.searchParams.get("side");
        } 
    } catch (err) {
        throw "Invalid input query parameters";
    }

    return { side };
}

function checkAction(requestUrl: URL) {
    let action;
    let betId;
    try {
        if (requestUrl.searchParams.get("action")) {
            action = requestUrl.searchParams.get("action")!;
        }
    } catch (err) {
        throw "Invalid input query parameters";
    }
    try {
        if (requestUrl.searchParams.get("betId")) {
            betId = requestUrl.searchParams.get("betId")!;
        }
    } catch (err) {
        throw "Invalid input query parameters";
    }

    return { action, betId };
}