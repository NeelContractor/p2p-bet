// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import BetIDL from '../target/idl/bet.json'
import type { Bet } from '../target/types/bet'

// Re-export the generated IDL and type
export { Bet, BetIDL }

// The programId is imported from the program IDL.
export const BET_PROGRAM_ID = new PublicKey(BetIDL.address)

// This is a helper function to get the Counter Anchor program.
export function getBetProgram(provider: AnchorProvider, address?: PublicKey): Program<Bet> {
  return new Program({ ...BetIDL, address: address ? address.toBase58() : BetIDL.address } as Bet, provider)
}

// This is a helper function to get the program ID for the Counter program depending on the cluster.
export function getBetProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the Counter program on devnet and testnet.
      return new PublicKey('DFQhXBvHUg4fds29PxkBeKrRYPBb5Le1B1SA8mPS1QGv')
    case 'mainnet-beta':
    default:
      return BET_PROGRAM_ID
  }
}
