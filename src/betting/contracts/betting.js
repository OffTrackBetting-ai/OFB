const { Connection, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, Token } = require('@solana/spl-token');

class BettingContract {
    constructor(config) {
        this.config = config;
        this.connection = new Connection(
            config.network === 'devnet' ? 
                'https://api.devnet.solana.com' : 
                'https://api.mainnet-beta.solana.com',
            'confirmed'
        );
        this.programId = new PublicKey(config.programId);
        this.minimumBet = config.minimumBet || 0.1; // in SOL
    }

    async placeBet(wallet, race, horse, amount, betType = 'win') {
        try {
            // Validate bet amount
            if (amount < this.minimumBet) {
                throw new Error(`Bet amount must be at least ${this.minimumBet} SOL`);
            }

            // Create betting instruction
            const instruction = await this.createBettingInstruction(
                wallet.publicKey,
                race.id,
                horse.id,
                amount,
                betType
            );

            // Create and sign transaction
            const transaction = new Transaction().add(instruction);
            const signature = await this.connection.sendTransaction(
                transaction,
                [wallet],
                { skipPreflight: false, preflightCommitment: 'confirmed' }
            );

            // Wait for confirmation
            await this.connection.confirmTransaction(signature);

            return {
                success: true,
                signature,
                betDetails: {
                    race: race.id,
                    horse: horse.id,
                    amount,
                    type: betType,
                    timestamp: Date.now()
                }
            };
        } catch (error) {
            console.error('Error placing bet:', error);
            throw error;
        }
    }

    async createBettingInstruction(bettor, raceId, horseId, amount, betType) {
        // Create a PDA for the bet account
        const [betAccount] = await PublicKey.findProgramAddress(
            [
                Buffer.from('bet'),
                bettor.toBuffer(),
                Buffer.from(raceId),
                Buffer.from(horseId)
            ],
            this.programId
        );

        // Instruction data
        const data = Buffer.from([
            0, // Instruction index for place_bet
            ...new Uint8Array(new Float64Array([amount]).buffer), // Amount
            ...Buffer.from(betType.padEnd(10)) // Bet type padded to 10 bytes
        ]);

        return {
            keys: [
                { pubkey: bettor, isSigner: true, isWritable: true },
                { pubkey: betAccount, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
            ],
            programId: this.programId,
            data
        };
    }

    async getBetsByRace(raceId) {
        try {
            const filters = [
                {
                    memcmp: {
                        offset: 0,
                        bytes: raceId
                    }
                }
            ];

            const accounts = await this.connection.getProgramAccounts(
                this.programId,
                { filters }
            );

            return accounts.map(account => this.parseBetAccount(account));
        } catch (error) {
            console.error('Error fetching race bets:', error);
            return [];
        }
    }

    async getBetsByBettor(bettor) {
        try {
            const filters = [
                {
                    memcmp: {
                        offset: 32, // Offset for bettor pubkey
                        bytes: bettor.toBase58()
                    }
                }
            ];

            const accounts = await this.connection.getProgramAccounts(
                this.programId,
                { filters }
            );

            return accounts.map(account => this.parseBetAccount(account));
        } catch (error) {
            console.error('Error fetching bettor bets:', error);
            return [];
        }
    }

    parseBetAccount(account) {
        // This would depend on your actual account structure
        // This is just an example
        const data = account.account.data;
        return {
            raceId: data.slice(0, 32).toString(),
            bettor: new PublicKey(data.slice(32, 64)),
            horseId: data.slice(64, 96).toString(),
            amount: new Float64Array(data.slice(96, 104))[0],
            betType: data.slice(104, 114).toString().trim(),
            timestamp: new Date(new Float64Array(data.slice(114, 122))[0]),
            status: data[122] // 0: pending, 1: won, 2: lost
        };
    }

    async claimWinnings(wallet, betAccount) {
        try {
            const instruction = await this.createClaimInstruction(
                wallet.publicKey,
                betAccount
            );

            const transaction = new Transaction().add(instruction);
            const signature = await this.connection.sendTransaction(
                transaction,
                [wallet],
                { skipPreflight: false, preflightCommitment: 'confirmed' }
            );

            await this.connection.confirmTransaction(signature);

            return {
                success: true,
                signature,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Error claiming winnings:', error);
            throw error;
        }
    }

    async createClaimInstruction(claimer, betAccount) {
        const data = Buffer.from([1]); // Instruction index for claim_winnings

        return {
            keys: [
                { pubkey: claimer, isSigner: true, isWritable: true },
                { pubkey: betAccount, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
            ],
            programId: this.programId,
            data
        };
    }

    async getWinningBets(wallet) {
        const bets = await this.getBetsByBettor(wallet.publicKey);
        return bets.filter(bet => bet.status === 1); // Status 1 = won
    }

    async calculatePayout(bet, finalOdds) {
        // Implement payout calculation based on bet type and odds
        switch (bet.betType) {
            case 'win':
                return bet.amount * finalOdds;
            case 'place':
                return bet.amount * (finalOdds * 0.8); // Example: 80% of win odds
            case 'show':
                return bet.amount * (finalOdds * 0.6); // Example: 60% of win odds
            default:
                return 0;
        }
    }
}

module.exports = BettingContract; 