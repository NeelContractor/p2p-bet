import { useBetProgram } from "@/components/bet/bet-data-access";
import { NextResponse } from "next/server";

export async function GET(req: Request){
    try{
        const { program } = useBetProgram();
        const allChatBets = (await program.account.bet.all());
        const allChatBettorsWithRepeatedOnes = (await program.account.userBet.all()).map(acc => acc.account);
        const bettorsWithRepeatedOnes = allChatBettorsWithRepeatedOnes.map(b => b.user.toBase58())
        const allChatBettors = allChatBettorsWithRepeatedOnes.filter((item, index) => bettorsWithRepeatedOnes.indexOf(item.user.toBase58()) === index)
        
        const bettors = await Promise.all(allChatBettors.map(async(b) => {
            const bettorAddress = b.user.toBase58();
            const betsForUser = allChatBettorsWithRepeatedOnes.filter(userBet => userBet.user.toBase58() == bettorAddress)
            const totalBetAmount = betsForUser.reduce((total: number, bet) => total + bet.amount.toNumber()/(10**9), 0);
            const totalResolvedBetAmount = betsForUser.filter(bet => bet.claimed).reduce((total: number, bet) => total + bet.amount.toNumber()/(10**9), 0);
            const bets = betsForUser.length;
            const bet = allChatBets.filter(bet => bet.publicKey.toBase58() == b.bet.toBase58())[0]
            const isResolved = bet.account.resolved;
            const finalOutcome = bet.account.outcome;
            const side = b.direction;
            const pnl = betsForUser.reduce((total, bet) => {
                if(isResolved){
                    if (finalOutcome === side) {
                        return total + bet.amount.toNumber()
                    } else {
                        return total - bet.amount.toNumber()
                    }
                }
                return 0
              }, 0)

              return {
                address: bettorAddress,
                totalResolvedBetVolume: totalResolvedBetAmount,
                totalBetVolume: totalBetAmount,
                bets: bets,
                pnl: pnl,
            }
        }))

        const topBettors = bettors
                        .sort((a, b) => b.totalBetVolume - a.totalBetVolume)
                        .map((bettor, index) => ({
                            rank: index + 1,
                            ...bettor}));
       

        return NextResponse.json(topBettors, {status: 200})

    } catch(err){
        if (err instanceof Error) {
            return NextResponse.json({ error: err.message }, { status: 500 });
        }
        return NextResponse.json({ error: 'Unable to Find Bets for Given User' }, { status: 500 });
    }
}