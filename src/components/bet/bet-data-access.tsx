'use client'

import { getBetProgram, getBetProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import { BN } from 'bn.js'
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token'

interface ProcessCreateBetArgs {
  betTitle: string, 
  betAmount: number, 
  endTime: number, 
  singerPubkey: PublicKey, 
  tokenMint: PublicKey
}

interface ProcessPlaceBetArgs {
  betTitle: string, 
  bettorPubkey: PublicKey, 
  betOutcome: boolean, 
  mintAddress: PublicKey
}

interface ProcessResolveBetArgs {
  betTitle: string, 
  creator: PublicKey, 
  resolveOutcome: boolean
}

interface ProcessClaimWinningsArgs {
  betTitle: string, 
  userPubkey: PublicKey, 
  mintAddress: PublicKey
}

export function useBetProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getBetProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getBetProgram(provider, programId), [provider, programId])

  const betAccounts = useQuery({
    queryKey: ['bet', 'all', { cluster }],
    queryFn: () => program.account.bet.all(),
  })

  const userBetAccounts = useQuery({
    queryKey: ['userBet', 'all', { cluster }],
    queryFn: () => program.account.userBet.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const processCreateBet = useMutation<string, Error, ProcessCreateBetArgs>({
    mutationKey: ['bet', 'initialize', { cluster }],
    mutationFn: async ({ betTitle, betAmount, endTime, singerPubkey, tokenMint }) => {

      const [betPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(betTitle)],
        program.programId
      );

      const [vaultAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), betPda.toBuffer()],
        program.programId
      );

      const [vaultTokenAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault_token_account"), betPda.toBuffer()],
        program.programId
      );

      return await program.methods
        .createBet(betTitle, new BN(betAmount), new BN(endTime))
        .accountsStrict({ 
          signer: singerPubkey,
          bet: betPda,
          vaultAuthority: vaultAuthorityPda,
          vaultTokenAccount: vaultTokenAccountPda,
          tokenMint: tokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY
        })
        .rpc()
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await betAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to initialize bet account')
    },
  })

  const processPlaceBet = useMutation<string, Error, ProcessPlaceBetArgs>({
    mutationKey: ['bet', 'place', { cluster }],
    mutationFn: async ({ betTitle, bettorPubkey, betOutcome, mintAddress }) => {
      const [betPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(betTitle)],
        program.programId
      );

      const [vaultTokenAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault_token_account"), betPda.toBuffer()],
        program.programId
      );

      const [userBetPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_bet"), betPda.toBuffer(), bettorPubkey.toBuffer()],
        program.programId
      );

      const bettorTokenAccount = getAssociatedTokenAddressSync(
        mintAddress,
        bettorPubkey
      );

      return await program.methods
        .placeBet(betOutcome)
        .accountsStrict({ 
          bettor: bettorPubkey,
          bet: betPda,
          userBet: userBetPda,
          bettorTokenAccount,
          vaultTokenAccount: vaultTokenAccountPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await userBetAccounts.refetch()
      await betAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to place bet')
    },
  })

  const processResolveBet = useMutation<string, Error, ProcessResolveBetArgs>({
    mutationKey: ['bet', 'resolve', { cluster }],
    mutationFn: async ({ creator, betTitle, resolveOutcome }) => {
      const [betPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(betTitle)],
        program.programId
      );

      return await program.methods
        .resolveBet(resolveOutcome)
        .accountsStrict({ 
          creator,
          bet: betPda
        })
        .rpc()
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await userBetAccounts.refetch()
      await betAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to resolve bet')
    },
  })

  const processClaimWinnings = useMutation<string, Error, ProcessClaimWinningsArgs>({
    mutationKey: ['winning', 'claim', { cluster }],
    mutationFn: async ({ betTitle, userPubkey, mintAddress }) => {
      const [betPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(betTitle)],
        program.programId
      );

      const [userBetPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_bet"), betPda.toBuffer(), userPubkey.toBuffer()],
        program.programId
      );

      const [vaultAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), betPda.toBuffer()],
        program.programId
      );

      const [vaultTokenAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault_token_account"), betPda.toBuffer()],
        program.programId
      );

      const userTokenAccount = getAssociatedTokenAddressSync(
        mintAddress,
        userPubkey
      );

      return await program.methods
        .claimWinnings()
        .accountsStrict({ 
          user: userPubkey,
          bet: betPda,
          userBet: userBetPda,
          vaultAuthority: vaultAuthorityPda,
          vaultTokenAccount: vaultTokenAccountPda,
          userTokenAccount,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID
        })
        .rpc()
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await userBetAccounts.refetch()
      await betAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to claim winnings')
    },
  })

  return {
    program,
    programId,
    betAccounts,
    userBetAccounts,
    getProgramAccount,
    processCreateBet,
    processPlaceBet,
    processResolveBet,
    processClaimWinnings
  }
}

export function useBetProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, betAccounts, userBetAccounts } = useBetProgram()

  // Fetch a specific bet account
  const betAccountQuery = useQuery({
    queryKey: ['bet', 'fetch', { cluster, account }],
    queryFn: () => program.account.bet.fetch(account),
  })

  // Fetch user bet accounts for a specific bet
  const userBetsByBetQuery = useQuery({
    queryKey: ['userBet', 'byBet', { cluster, account }],
    queryFn: async () => {
      const userBets = await program.account.userBet.all([
        {
          memcmp: {
            offset: 40, // Skip discriminator (8) + user pubkey (32) = 40 bytes
            bytes: account.toBase58(),
          }
        }
      ]);
      return userBets;
    },
  })

  // Fetch user bet accounts for a specific user
  const userBetsByUserQuery = (userPubkey: PublicKey) => useQuery({
    queryKey: ['userBet', 'byUser', { cluster, userPubkey: userPubkey.toString() }],
    queryFn: async () => {
      const userBets = await program.account.userBet.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator (8 bytes)
            bytes: userPubkey.toBase58(),
          }
        }
      ]);
      return userBets;
    },
  })

  // Get bet statistics
  const getBetStats = useQuery({
    queryKey: ['bet', 'stats', { cluster, account }],
    queryFn: async () => {
      const bet = await program.account.bet.fetch(account);
      const totalPool = bet.totalYesAmount.toNumber() + bet.totalNoAmount.toNumber();
      const totalBettors = bet.yesBettors.toNumber() + bet.noBettors.toNumber();
      
      return {
        totalPool,
        totalBettors,
        yesPool: bet.totalYesAmount.toNumber(),
        noPool: bet.totalNoAmount.toNumber(),
        yesBettors: bet.yesBettors.toNumber(),
        noBettors: bet.noBettors.toNumber(),
        yesOdds: totalPool > 0 ? (bet.totalNoAmount.toNumber() / bet.totalYesAmount.toNumber()) + 1 : 1,
        noOdds: totalPool > 0 ? (bet.totalYesAmount.toNumber() / bet.totalNoAmount.toNumber()) + 1 : 1,
      };
    },
    enabled: !!betAccountQuery.data,
  })

  // Check if user can claim winnings
  const canClaimWinnings = (userBet: any, bet: any) => {
    return bet.resolved && 
           !userBet.claimed && 
           userBet.direction === bet.outcome;
  }

  // Calculate potential winnings for a user
  const calculateWinnings = (userBet: any, bet: any) => {
    if (!bet.resolved || userBet.direction !== bet.outcome) {
      return 0;
    }

    const totalPool = bet.totalYesAmount.toNumber() + bet.totalNoAmount.toNumber();
    const winningPool = bet.outcome ? bet.totalYesAmount.toNumber() : bet.totalNoAmount.toNumber();
    
    if (winningPool === 0) return 0;
    
    return Math.floor((totalPool * userBet.amount.toNumber()) / winningPool);
  }

  return {
    betAccountQuery,
    userBetsByBetQuery,
    userBetsByUserQuery,
    getBetStats,
    canClaimWinnings,
    calculateWinnings,
  }
}