class BettingContract {
    constructor(config) {
        this.config = config;
        this.minimumBet = config.minimumBet || 0.1;
        this.bets = new Map(); // In-memory storage for bets
        this.winningBets = new Map(); // Track winning bets
    }

    async placeBet(user, race, horse, amount, betType = 'win') {
        try {
            // Validate bet amount
            if (amount < this.minimumBet) {
                throw new Error(`Bet amount must be at least ${this.minimumBet}`);
            }

            const betId = this.generateBetId(user, race, horse);
            const betDetails = {
                id: betId,
                user: user,
                race: race.id,
                horse: horse.id,
                amount: amount,
                type: betType,
                odds: race.getCurrentOdds(horse.id),
                timestamp: Date.now(),
                status: 'pending' // pending, won, lost
            };

            // Store the bet
            this.bets.set(betId, betDetails);

            return {
                success: true,
                betId: betId,
                betDetails: betDetails
            };
        } catch (error) {
            console.error('Error placing bet:', error);
            throw error;
        }
    }

    generateBetId(user, race, horse) {
        return `bet_${user}_${race.id}_${horse.id}_${Date.now()}`;
    }

    async getBetsByRace(raceId) {
        try {
            return Array.from(this.bets.values())
                .filter(bet => bet.race === raceId);
        } catch (error) {
            console.error('Error fetching race bets:', error);
            return [];
        }
    }

    async getBetsByUser(user) {
        try {
            return Array.from(this.bets.values())
                .filter(bet => bet.user === user);
        } catch (error) {
            console.error('Error fetching user bets:', error);
            return [];
        }
    }

    async claimWinnings(user, betId) {
        try {
            const bet = this.bets.get(betId);
            if (!bet) {
                throw new Error('Bet not found');
            }

            if (bet.user !== user) {
                throw new Error('Unauthorized to claim these winnings');
            }

            if (bet.status !== 'won') {
                throw new Error('No winnings to claim for this bet');
            }

            // Calculate payout
            const payout = await this.calculatePayout(bet);

            // Mark bet as claimed
            bet.status = 'claimed';
            this.bets.set(betId, bet);

            return {
                success: true,
                payout: payout,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Error claiming winnings:', error);
            throw error;
        }
    }

    async getWinningBets(user) {
        try {
            return Array.from(this.bets.values())
                .filter(bet => bet.user === user && bet.status === 'won');
        } catch (error) {
            console.error('Error fetching winning bets:', error);
            return [];
        }
    }

    async calculatePayout(bet) {
        // Implement payout calculation based on bet type and odds
        switch (bet.type) {
            case 'win':
                return bet.amount * bet.odds;
            case 'place':
                return bet.amount * (bet.odds * 0.8); // Example: 80% of win odds
            case 'show':
                return bet.amount * (bet.odds * 0.6); // Example: 60% of win odds
            default:
                return 0;
        }
    }

    async updateBetStatus(betId, status, finalOdds = null) {
        try {
            const bet = this.bets.get(betId);
            if (!bet) {
                throw new Error('Bet not found');
            }

            bet.status = status;
            if (finalOdds) {
                bet.finalOdds = finalOdds;
            }

            this.bets.set(betId, bet);

            if (status === 'won') {
                this.winningBets.set(betId, bet);
            }

            return {
                success: true,
                betId: betId,
                status: status
            };
        } catch (error) {
            console.error('Error updating bet status:', error);
            throw error;
        }
    }

    async getBetDetails(betId) {
        try {
            return this.bets.get(betId) || null;
        } catch (error) {
            console.error('Error fetching bet details:', error);
            return null;
        }
    }

    async getAllBets() {
        try {
            return Array.from(this.bets.values());
        } catch (error) {
            console.error('Error fetching all bets:', error);
            return [];
        }
    }
}

module.exports = BettingContract; 