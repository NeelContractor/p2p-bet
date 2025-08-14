import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Bet } from "../target/types/bet";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createMint, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";

describe("Betting Contract Tests", () => {
  // Configure the client to use the local cluster.
  let tokenMint: PublicKey;
  let betAccountKey: PublicKey;
  let vaultTokenAccount: PublicKey;
  let bettorTokenAccount: PublicKey;
  let userBetAccount: PublicKey;
  let noBettorUserBetAccount: PublicKey;
  let noBettor: Keypair;
  
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const tokenCreator = provider.wallet as anchor.Wallet;
  const program = anchor.workspace.Bet as Program<Bet>;
  const mint = Keypair.generate();
  
  const betTitle = "SOL 500$ before December 2025?";
  const betAmount = new BN(100 * Math.pow(10, 6)); // 100 tokens (accounting for decimals)
  
  // Create a future end time (15 seconds from now)
  const endTime = new BN(Math.floor(Date.now() / 1000) + 15);

  beforeAll(async () => {
    // Create token mint
    tokenMint = await createMint(
      provider.connection,
      tokenCreator.payer,
      provider.publicKey,
      null,
      6,  // 6 decimals like USDC
      mint
    );
    console.log("Token created: ", tokenMint.toString());

    const amountToMint = 1000000 * Math.pow(10, 6); // 1M tokens
    const providerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      tokenCreator.payer,
      tokenMint,
      provider.publicKey
    );

    await mintTo(
      provider.connection,
      tokenCreator.payer,
      tokenMint,
      providerTokenAccount.address,
      tokenCreator.publicKey,
      amountToMint
    );

    console.log(`Minted ${amountToMint / Math.pow(10, 6)} tokens to ${provider.publicKey.toString()}`);

    // Get bettor token account
    bettorTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      provider.publicKey,
      true
    );
    console.log("Bettor token account: ", bettorTokenAccount.toString());
  });

  it("Should create a bet", async () => {
    const payerWallet = provider.wallet;
    console.log("Provider Wallet: ", payerWallet.publicKey.toBase58());

    // Get bet account PDA
    [betAccountKey] = PublicKey.findProgramAddressSync(
      [Buffer.from(betTitle)],
      program.programId
    );
    console.log("Bet Account: ", betAccountKey.toString());

    const tx = await program.methods
      .createBet(betTitle, betAmount, endTime)
      .accounts({
        signer: payerWallet.publicKey,
        tokenMint: tokenMint,
      })
      .rpc({ commitment: "confirmed" });
    
    console.log("Successfully created bet", tx);
    console.log(`Bet will end at: ${new Date(endTime.toNumber() * 1000).toISOString()}`);

    // Verify bet was created properly
    const betAccount = await program.account.bet.fetch(betAccountKey);
    expect(betAccount.creator.toString()).toEqual(payerWallet.publicKey.toString());
    expect(betAccount.title).toEqual(betTitle);
    expect(betAccount.betAmount.toNumber()).toEqual(betAmount.toNumber());
    expect(betAccount.resolved).toBeFalsy;
    expect(betAccount.yesBettors.toNumber()).toEqual(0);
    expect(betAccount.noBettors.toNumber()).toEqual(0);
  });

  it("Should place a YES bet", async () => {
    // Get vault token account PDA
    [vaultTokenAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_token_account"), betAccountKey.toBuffer()],
      program.programId
    );

    // Get user bet account PDA
    [userBetAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_bet"), betAccountKey.toBuffer(), provider.publicKey.toBuffer()],
      program.programId
    );

    const betAccount = await program.account.bet.fetch(betAccountKey);
    console.log("Bet Account Details: ", {
      yesBettors: betAccount.yesBettors.toNumber(),
      noBettors: betAccount.noBettors.toNumber(),
      totalYesAmount: betAccount.totalYesAmount.toNumber(),
      totalNoAmount: betAccount.totalNoAmount.toNumber()
    });

    const vault_token_balance_0 = await provider.connection.getTokenAccountBalance(vaultTokenAccount);
    console.log("Vault Account Balance Before: ", vault_token_balance_0.value.amount);

    const tx = await program.methods
      .placeBet(true) // true for YES
      .accounts({
        bettor: provider.wallet.publicKey,
        bet: betAccountKey,
        bettorTokenAccount: bettorTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
      })
      .rpc({ commitment: "confirmed" });

    console.log("Successfully placed YES bet: ", tx);

    const updatedBetAccountState = await program.account.bet.fetch(betAccountKey);
    console.log("Bet Account Details (Updated): ", {
      yesBettors: updatedBetAccountState.yesBettors.toNumber(),
      noBettors: updatedBetAccountState.noBettors.toNumber(),
      totalYesAmount: updatedBetAccountState.totalYesAmount.toNumber(),
      totalNoAmount: updatedBetAccountState.totalNoAmount.toNumber()
    });

    const vault_token_balance = await provider.connection.getTokenAccountBalance(vaultTokenAccount);
    console.log("Vault Account Balance After: ", vault_token_balance.value.amount);

    // Verify the bet was placed correctly
    expect(updatedBetAccountState.yesBettors.toNumber()).toEqual(1);
    expect(updatedBetAccountState.totalYesAmount.toNumber()).toEqual(betAmount.toNumber());
    
    // Verify user bet was created
    const userBet = await program.account.userBet.fetch(userBetAccount);
    expect(userBet.user.toString()).toEqual(provider.publicKey.toString());
    expect(userBet.bet.toString()).toEqual(betAccountKey.toString());
    expect(userBet.amount.toNumber()).toEqual(betAmount.toNumber());
    expect(userBet.direction).toBeTruthy; // YES bet
    expect(userBet.claimed).toBeFalsy;
  });

  it("Should place a NO bet with another user", async () => {
    // Create another user for NO bet
    noBettor = Keypair.generate();
    
    // Airdrop SOL to the new user
    const airdropSignature = await provider.connection.requestAirdrop(
      noBettor.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSignature);

    // Create token account for NO bettor
    const noBettorTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      tokenCreator.payer,
      tokenMint,
      noBettor.publicKey
    );

    // Mint tokens to NO bettor
    await mintTo(
      provider.connection,
      tokenCreator.payer,
      tokenMint,
      noBettorTokenAccount.address,
      tokenCreator.publicKey,
      betAmount.toNumber()
    );

    // Create user bet PDA for NO bettor
    [noBettorUserBetAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_bet"), betAccountKey.toBuffer(), noBettor.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .placeBet(false) // false for NO
      .accounts({
        bettor: noBettor.publicKey,
        bet: betAccountKey,
        bettorTokenAccount: noBettorTokenAccount.address,
        vaultTokenAccount: vaultTokenAccount,
      })
      .signers([noBettor])
      .rpc({ commitment: "confirmed" });

    console.log("Successfully placed NO bet: ", tx);

    const updatedBetAccountState = await program.account.bet.fetch(betAccountKey);
    console.log("Bet Account Details (After NO bet): ", {
      yesBettors: updatedBetAccountState.yesBettors.toNumber(),
      noBettors: updatedBetAccountState.noBettors.toNumber(),
      totalYesAmount: updatedBetAccountState.totalYesAmount.toNumber(),
      totalNoAmount: updatedBetAccountState.totalNoAmount.toNumber()
    });

    // Verify the NO bet was placed correctly
    expect(updatedBetAccountState.noBettors.toNumber()).toEqual(1);
    expect(updatedBetAccountState.totalNoAmount.toNumber()).toEqual(betAmount.toNumber());
  });

  it("Should wait for bet end time and then resolve the bet", async () => {
    const betAccount = await program.account.bet.fetch(betAccountKey);
    const currentTime = Math.floor(Date.now() / 1000);
    const endTimeSeconds = betAccount.endTime.toNumber();
    
    console.log("Current time:", new Date(currentTime * 1000).toISOString());
    console.log("Bet end time:", new Date(endTimeSeconds * 1000).toISOString());
    console.log(`Time until bet ends: ${endTimeSeconds - currentTime} seconds`);

    if (currentTime < endTimeSeconds) {
      const waitTime = (endTimeSeconds - currentTime + 1) * 1000; // Add 1 second buffer
      console.log(`Waiting ${waitTime / 1000} seconds for bet to end...`);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      console.log("Wait complete. Current time:", new Date(Date.now()).toISOString());
    } else {
      console.log("Bet has already ended");
    }

    // Verify we can't place bets after end time
    try {
      const testBettor = Keypair.generate();
      await provider.connection.requestAirdrop(testBettor.publicKey, LAMPORTS_PER_SOL);
      
      const testBettorTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        tokenCreator.payer,
        tokenMint,
        testBettor.publicKey
      );

      await mintTo(
        provider.connection,
        tokenCreator.payer,
        tokenMint,
        testBettorTokenAccount.address,
        tokenCreator.publicKey,
        betAmount.toNumber()
      );

      await program.methods
        .placeBet(true)
        .accounts({
          bettor: testBettor.publicKey,
          bet: betAccountKey,
          bettorTokenAccount: testBettorTokenAccount.address,
          vaultTokenAccount: vaultTokenAccount,
        })
        .signers([testBettor])
        .rpc({ commitment: "confirmed" });
      
      // Should not reach here
      throw new Error("Expected bet placement to fail after end time");
    } catch (error) {
      console.log("Expected error when trying to bet after end time:", error.error?.errorCode?.code || error.message);
      expect(error.error?.errorCode?.code).toContain("BetEndTimeExceeded");
    }

    // Now resolve the bet
    console.log("Resolving bet...");
    
    // For testing, let's assume NO wins (so the NO bettor can claim winnings)
    const outcome = false; // NO wins

    const tx = await program.methods
      .resolveBet(outcome)
      .accounts({
        creator: provider.wallet.publicKey,
        bet: betAccountKey,
      })
      .rpc({ commitment: "confirmed" });

    console.log("Successfully resolved bet: ", tx);

    const resolvedBetAccount = await program.account.bet.fetch(betAccountKey);
    expect(resolvedBetAccount.resolved).toBeTruthy;
    expect(resolvedBetAccount.outcome).toEqual(outcome);
    console.log("Bet resolved with outcome:", resolvedBetAccount.outcome ? "YES" : "NO");
  }, 20000); // Increase timeout to 20 seconds

  it("Should claim winnings for NO bettor", async () => {
    const betAccount = await program.account.bet.fetch(betAccountKey);
    const userBet = await program.account.userBet.fetch(noBettorUserBetAccount);

    console.log("Claiming winnings for NO bettor...");
    console.log("Bet outcome:", betAccount.outcome ? "YES" : "NO");
    console.log("User bet direction:", userBet.direction ? "YES" : "NO");
    console.log("User should win:", betAccount.outcome === userBet.direction);

    // Get NO bettor's token account
    const noBettorTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      noBettor.publicKey
    );

    // Get user's token balance before claiming
    const userTokenBalanceBefore = await provider.connection.getTokenAccountBalance(noBettorTokenAccount);
    console.log("NO bettor token balance before claiming:", userTokenBalanceBefore.value.amount);

    const tx = await program.methods
      .claimWinnings()
      .accounts({
        user: noBettor.publicKey,
        bet: betAccountKey,
        vaultTokenAccount: vaultTokenAccount,
        userTokenAccount: noBettorTokenAccount,
      })
      .signers([noBettor])
      .rpc({ commitment: "confirmed" });

    console.log("Successfully claimed winnings: ", tx);

    // Check user's token balance after claiming
    const userTokenBalanceAfter = await provider.connection.getTokenAccountBalance(noBettorTokenAccount);
    console.log("NO bettor token balance after claiming:", userTokenBalanceAfter.value.amount);

    // Verify user bet is marked as claimed
    const updatedUserBet = await program.account.userBet.fetch(noBettorUserBetAccount);
    expect(updatedUserBet.claimed).toBeTruthy;

    // Verify user received winnings (should be more than their original bet)
    const balanceIncrease = parseInt(userTokenBalanceAfter.value.amount) - parseInt(userTokenBalanceBefore.value.amount);
    console.log("Balance increase:", balanceIncrease);
    expect(balanceIncrease).toBeGreaterThan(0);
  });

  it("Should fail when YES bettor tries to claim (they lost)", async () => {
    try {
      await program.methods
        .claimWinnings()
        .accounts({
          user: provider.wallet.publicKey,
          bet: betAccountKey,
          vaultTokenAccount: vaultTokenAccount,
          userTokenAccount: bettorTokenAccount,
        })
        .rpc({ commitment: "confirmed" });
      
      // Should not reach here
      throw new Error("Expected transaction to fail for losing bettor");
    } catch (error) {
      console.log("Expected error when losing bettor tries to claim:", error.error?.errorCode?.code || error.message);
      expect(error.error?.errorCode?.code).toContain("NotWinner");
    }
  });

  it("Should fail when trying to claim winnings twice", async () => {
    try {
      await program.methods
        .claimWinnings()
        .accounts({
          user: noBettor.publicKey,
          bet: betAccountKey,
          vaultTokenAccount: vaultTokenAccount,
          userTokenAccount: await getAssociatedTokenAddress(tokenMint, noBettor.publicKey),
        })
        .signers([noBettor])
        .rpc({ commitment: "confirmed" });
      
      // Should not reach here
      throw new Error("Expected transaction to fail when claiming twice");
    } catch (error) {
      console.log("Expected error when trying to claim twice:", error.error?.errorCode?.code || error.message);
      expect(error.error?.errorCode?.code).toContain("AlreadyClaimed");
    }
  });

  it("Should fail when non-winner tries to claim", async () => {
    // Create a new user who didn't bet
    const nonBettor = Keypair.generate();
    
    // Airdrop SOL
    const airdropSignature = await provider.connection.requestAirdrop(
      nonBettor.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSignature);

    // Create token account
    const nonBettorTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      tokenCreator.payer,
      tokenMint,
      nonBettor.publicKey
    );

    try {
      await program.methods
        .claimWinnings()
        .accounts({
          user: nonBettor.publicKey,
          bet: betAccountKey,
          vaultTokenAccount: vaultTokenAccount,
          userTokenAccount: nonBettorTokenAccount.address,
        })
        .signers([nonBettor])
        .rpc({ commitment: "confirmed" });
      
      // Should not reach here
      throw new Error("Expected transaction to fail for non-bettor");
    } catch (error) {
      console.log("Expected error for non-bettor trying to claim:", error.error?.errorCode?.code || error.message);
      // This should fail because the user bet account doesn't exist
      expect(error.error?.errorCode?.code).toContain("AccountNotInitialized");
    }
  });
});