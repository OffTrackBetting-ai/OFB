const Anthropic = require('@anthropic-ai/sdk');
const { Connection, PublicKey } = require('@solana/web3.js');

class BetterAnalyzer {
    constructor(config) {
        this.config = config;
        this.connection = new Connection(
            config.network === 'devnet' ? 
                'https://api.devnet.solana.com' : 
                'https://api.mainnet-beta.solana.com',
            'confirmed'
        );
        this.anthropic = new Anthropic({
            apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY
        });
        this.betterProfiles = new Map();
        this.profitableThreshold = config.profitableThreshold || 1.5; // 150% ROI
        this.minBetsForAnalysis = config.minBetsForAnalysis || 50;
    }

    async analyzeBetter(address) {
        try {
            const bettingHistory = await this.getBettingHistory(address);
            if (!this.isProfileValid(bettingHistory)) {
                return null;
            }

            const profitability = this.calculateProfitability(bettingHistory);
            if (profitability < this.profitableThreshold) {
                return null;
            }

            const analysis = await this.analyzePattern(address, bettingHistory);
            await this.updateBetterProfile(address, analysis);

            return analysis;
        } catch (error) {
            console.error('Error analyzing better:', error);
            return null;
        }
    }

    async getBettingHistory(address) {
        try {
            const publicKey = new PublicKey(address);
            const signatures = await this.connection.getSignaturesForAddress(
                publicKey,
                { limit: 1000 }
            );

            const transactions = await Promise.all(
                signatures.map(sig => 
                    this.connection.getParsedTransaction(sig.signature)
                )
            );

            return this.processBettingTransactions(transactions);
        } catch (error) {
            console.error('Error fetching betting history:', error);
            return [];
        }
    }

    processBettingTransactions(transactions) {
        const bettingHistory = [];
        
        for (const tx of transactions) {
            if (!this.isBettingTransaction(tx)) continue;

            const betDetails = this.extractBetDetails(tx);
            if (betDetails) {
                bettingHistory.push(betDetails);
            }
        }

        return bettingHistory;
    }

    isBettingTransaction(transaction) {
        if (!transaction?.meta || !transaction.transaction) return false;

        // Check if transaction involves our betting program
        return transaction.transaction.message.instructions.some(ix => 
            ix.programId.equals(new PublicKey(this.config.BETTING_PROGRAM_ID))
        );
    }

    extractBetDetails(transaction) {
        try {
            const instruction = transaction.transaction.message.instructions.find(ix =>
                ix.programId.equals(new PublicKey(this.config.BETTING_PROGRAM_ID))
            );

            if (!instruction) return null;

            // Parse instruction data based on your program's instruction format
            const data = instruction.data;
            return {
                raceId: data.slice(1, 33).toString(),
                horseId: data.slice(33, 65).toString(),
                amount: new Float64Array(data.slice(65, 73))[0],
                odds: new Float64Array(data.slice(73, 81))[0],
                betType: data.slice(81, 91).toString().trim(),
                timestamp: transaction.blockTime,
                result: transaction.meta.err === null ? 'won' : 'lost',
                signature: transaction.signature
            };
        } catch (error) {
            console.error('Error extracting bet details:', error);
            return null;
        }
    }

    calculateProfitability(bettingHistory) {
        if (!bettingHistory.length) return 0;

        const totalBets = bettingHistory.length;
        const totalInvested = bettingHistory.reduce((sum, bet) => sum + bet.amount, 0);
        const totalReturns = bettingHistory.reduce((sum, bet) => {
            if (bet.result === 'won') {
                return sum + (bet.amount * bet.odds);
            }
            return sum;
        }, 0);

        return totalReturns / totalInvested;
    }

    isProfileValid(bettingHistory) {
        return bettingHistory.length >= this.minBetsForAnalysis;
    }

    async analyzePattern(address, bettingHistory) {
        const prompt = this.constructPrompt(bettingHistory);
        
        try {
            const message = await this.anthropic.messages.create({
                model: "claude-3-opus-20240229",
                max_tokens: 1500,
                temperature: 0.7,
                system: "You are an expert horse racing analyst specializing in identifying successful betting patterns. Analyze the betting history to identify key strategies and patterns that lead to profitable outcomes.",
                messages: [{
                    role: "user",
                    content: prompt
                }]
            });

            const analysis = this.processAIResponse(message.content[0].text);
            return {
                address,
                timestamp: Date.now(),
                profitability: this.calculateProfitability(bettingHistory),
                totalBets: bettingHistory.length,
                winRate: bettingHistory.filter(bet => bet.result === 'won').length / bettingHistory.length,
                patterns: analysis.patterns,
                preferredTracks: analysis.preferredTracks,
                preferredBetTypes: analysis.preferredBetTypes,
                riskProfile: analysis.riskProfile,
                successFactors: analysis.successFactors,
                recommendedStrategies: analysis.recommendedStrategies
            };
        } catch (error) {
            console.error('Error analyzing pattern:', error);
            return null;
        }
    }

    constructPrompt(bettingHistory) {
        return `Analyze the following betting history from a profitable horse racing better:

Betting History:
${JSON.stringify(bettingHistory, null, 2)}

Please analyze and provide:
1. Key betting patterns and strategies
2. Preferred tracks and conditions
3. Preferred bet types and sizing
4. Risk profile assessment
5. Success factors
6. Recommended strategies to emulate

Format your response in a structured way with clear section headers.`;
    }

    processAIResponse(response) {
        const sections = response.split('\n\n');
        const analysis = {
            patterns: [],
            preferredTracks: [],
            preferredBetTypes: [],
            riskProfile: '',
            successFactors: [],
            recommendedStrategies: []
        };

        let currentSection = '';
        for (const section of sections) {
            if (section.includes('Betting Patterns:')) {
                currentSection = 'patterns';
            } else if (section.includes('Preferred Tracks:')) {
                currentSection = 'tracks';
            } else if (section.includes('Preferred Bet Types:')) {
                currentSection = 'betTypes';
            } else if (section.includes('Risk Profile:')) {
                currentSection = 'risk';
            } else if (section.includes('Success Factors:')) {
                currentSection = 'success';
            } else if (section.includes('Recommended Strategies:')) {
                currentSection = 'strategies';
            } else if (section.trim()) {
                switch (currentSection) {
                    case 'patterns':
                        analysis.patterns.push(section.trim());
                        break;
                    case 'tracks':
                        analysis.preferredTracks.push(section.trim());
                        break;
                    case 'betTypes':
                        analysis.preferredBetTypes.push(section.trim());
                        break;
                    case 'risk':
                        analysis.riskProfile = section.trim();
                        break;
                    case 'success':
                        analysis.successFactors.push(section.trim());
                        break;
                    case 'strategies':
                        analysis.recommendedStrategies.push(section.trim());
                        break;
                }
            }
        }

        return analysis;
    }

    async updateBetterProfile(address, analysis) {
        this.betterProfiles.set(address, {
            ...analysis,
            lastUpdated: Date.now()
        });
    }

    async getTopBetters(limit = 10) {
        const profiles = Array.from(this.betterProfiles.entries())
            .map(([address, profile]) => ({
                address,
                ...profile
            }))
            .sort((a, b) => b.profitability - a.profitability)
            .slice(0, limit);

        return profiles;
    }

    async getRecommendedStrategies() {
        const topBetters = await this.getTopBetters(5);
        const commonStrategies = new Map();

        // Aggregate strategies from top betters
        for (const better of topBetters) {
            for (const strategy of better.recommendedStrategies) {
                const count = commonStrategies.get(strategy) || 0;
                commonStrategies.set(strategy, count + 1);
            }
        }

        // Sort strategies by frequency
        return Array.from(commonStrategies.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([strategy, count]) => ({
                strategy,
                frequency: count / topBetters.length,
                confidence: count / topBetters.length
            }));
    }
}

module.exports = BetterAnalyzer; 