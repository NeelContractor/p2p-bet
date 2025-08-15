/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    Connection,
    PublicKey,
    clusterApiUrl,
    Transaction,
    sendAndConfirmTransaction,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { SolanaAgentKit } from "solana-agent-kit"; //  TODO: update this logic
import * as anchor from "@coral-xyz/anchor";
import { useBetProgram } from "@/components/bet/bet-data-access";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BN } from "bn.js";
  
export async function get_swap_blink(
    agent: SolanaAgentKit, // TODO:  update this logic
    tokenA: string,
    tokenB: string,
): Promise<string> {
    try {
        if (!tokenA || !tokenB) {
            return "Error, please give valid params for blink";
        }

        const blinkURL = `https://dial.to/?action=solana-action:https://jupiter.dial.to/swap/${tokenA}-${tokenB}`;
        return blinkURL;
    } catch (error: any) {
        throw new Error(`Blink Fetch failed: ${error.message}`);
    }
}
  
export async function get_bet_blink(
    agent: SolanaAgentKit,// TODO:  update this logic
    betTitle: string,
    betAmount: number,
    betResolutionDateString: string,
    tokenTicker: string,
): Promise<string> {
    try {
        if (!betAmount || !betTitle || !betResolutionDateString || !tokenTicker) {
            return "Error, please give valid params for blink";
        }

        let mint: PublicKey;
        if(!tokenTicker || tokenTicker == 'USDC'){
            mint = new PublicKey('GBmXkFGMxsYUM48vwQGGfSA1X4AVWj8Pf2oADAHdfAEa')
        }
        else{
            const tokenData = await agent.getTokenDataByTicker(tokenTicker);
            mint = tokenData ? new PublicKey(tokenData.address || 'GBmXkFGMxsYUM48vwQGGfSA1X4AVWj8Pf2oADAHdfAEa') : new PublicKey('GBmXkFGMxsYUM48vwQGGfSA1X4AVWj8Pf2oADAHdfAEa');
        }

        const { program } = useBetProgram();
        const [betAccount] = PublicKey.findProgramAddressSync(
                [Buffer.from(betTitle)],
                program.programId,
        );
        const [vaultAuthority] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault"), betAccount.toBuffer()],
                program.programId
        );
        const [vaultTokenAccount] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault_token_account"), betAccount.toBuffer()],
                program.programId
        );
        const actionURL = `http://belzin.fun/api/actions/bet?betId=${betAccount.toBase58()}`;
        
        await program.methods
            .createBet(
                betTitle,
                new BN(betAmount * Math.pow(10, 9)),
                new BN(1767182400),
            )
            .accountsStrict({
                bet: betAccount,
                signer: agent.wallet.publicKey,// TODO: update this logic
                vaultAuthority: vaultAuthority,
                vaultTokenAccount: vaultTokenAccount,
                tokenMint: mint,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                rent: SYSVAR_RENT_PUBKEY
            })
            .rpc({commitment: "confirmed"});
  
        return actionURL;
    } catch (error: any) {
        throw new Error(`Blink Fetch failed: ${error.message}`);
    }
}
  
export async function executeBlink(
    agent: SolanaAgentKit,
    blinkURL: string,
    amount: number,
    tokenA: string,
    tokenB: string,
) {
    try {
        const res = await fetch(`https://jupiter.dial.to/swap/${tokenA}-${tokenB}?amount=${amount}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    account: agent.wallet.publicKey.toBase58(),
                }),
            },
        );
  
        const data = await res.json();
        if (data.transaction) {
            const txn = Transaction.from(Buffer.from(data.transaction, "base64"));
            txn.sign(agent.wallet);
            txn.recentBlockhash = (
                await agent.connection.getLatestBlockhash()
            ).blockhash;
            const sig = await sendAndConfirmTransaction(
                new Connection(clusterApiUrl("devnet")),
                txn,
                [agent.wallet],
                { commitment: "confirmed" },
            );
            return sig;
        } else {
            return "failed";
        }
    } catch (error: any) {
        console.error(error);
        throw new Error(`RPS game failed: ${error.message}`);
    }
}
  
export function dateStringToEpoch(dateStr: string): number {
    const cleanDateStr = dateStr.replace(/(st|nd|rd|th)/, "");
    const date = new Date(cleanDateStr);
    const epochTimestamp = Math.floor(date.getTime() / 1000);

    return epochTimestamp;
}  