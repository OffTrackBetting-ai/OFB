const Anthropic = require('@anthropic-ai/sdk');

class BetterAnalyzer {
    constructor(config) {
        this.config = config;
        this.anthropic = new Anthropic({
            apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY
        });
        this.betterProfiles = new Map();
        this.profitableThreshold = config.profitableThreshold || 1.5; // 150% ROI
        this.minBetsForAnalysis = config.minBetsForAnalysis || 50;
        this.bettingHistory = new Map(); // Cache for betting history
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
            // Check cache first
            if (this.bettingHistory.has(address)) {
                return this.bettingHistory.get(address);
            }

            // This would typically fetch from your betting database
            // For now, return mock data
            const mockHistory = this.generateMockBettingHistory();
            
            // Cache the results
            this.bettingHistory.set(address, mockHistory);
            
            return mockHistory;
        } catch (error) {
            console.error('Error fetching betting history:', error);
            return [];
        }
    }

    generateMockBettingHistory() {
        const history = [];
        const tracks = ['Churchill Downs', 'Belmont Park', 'Santa Anita'];
        const betTypes = ['win', 'place', 'show', 'exacta', 'trifecta'];
        const results = ['won', 'lost'];

        // Generate 100 mock bets
        for (let i = 0; i < 100; i++) {
            history.push({
                raceId: `race_${Math.floor(Math.random() * 1000)}`,
                horseId: `horse_${Math.floor(Math.random() * 100)}`,
                amount: Math.random() * 100,
                odds: 1 + Math.random() * 10,
                betType: betTypes[Math.floor(Math.random() * betTypes.length)],
                track: tracks[Math.floor(Math.random() * tracks.length)],
                timestamp: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000, // Random time in last 30 days
                result: results[Math.floor(Math.random() * results.length)]
            });
        }

        return history.sort((a, b) => b.timestamp - a.timestamp);
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