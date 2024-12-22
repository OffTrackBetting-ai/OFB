const BetterAnalyzer = require('../analysis/better-analyzer');
const StrategyAggregator = require('../analysis/strategy-aggregator');
const { Connection, PublicKey } = require('@solana/web3.js');

class RecommendationService {
    constructor(config) {
        this.config = config;
        this.connection = new Connection(
            config.network === 'devnet' ? 
                'https://api.devnet.solana.com' : 
                'https://api.mainnet-beta.solana.com',
            'confirmed'
        );
        this.betterAnalyzer = new BetterAnalyzer(config);
        this.strategyAggregator = new StrategyAggregator(config);
        this.recommendations = new Map();
        this.lastUpdate = new Map();
        this.updateInterval = config.recommendationUpdateInterval || 300000; // 5 minutes
    }

    async initialize() {
        try {
            // Find and analyze profitable betters
            const profitableBetters = await this.findProfitableBetters();
            const betterProfiles = await this.analyzeBetters(profitableBetters);
            
            // Aggregate strategies
            const strategies = await this.strategyAggregator.aggregateStrategies(betterProfiles);
            
            // Initialize recommendations
            await this.updateRecommendations(strategies);

            console.log('Recommendation service initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing recommendation service:', error);
            return false;
        }
    }

    async findProfitableBetters() {
        try {
            // Find accounts that have interacted with our betting program
            const accounts = await this.connection.getProgramAccounts(
                new PublicKey(this.config.BETTING_PROGRAM_ID),
                {
                    dataSize: 165, // Expected size of a betting account
                    filters: [
                        {
                            // Filter for accounts with high win rates
                            memcmp: {
                                offset: 32, // Offset for win rate in account data
                                bytes: Buffer.from([0x3F, 0x80]) // > 0.5 in float
                            }
                        }
                    ]
                }
            );

            return accounts.map(account => account.pubkey.toString());
        } catch (error) {
            console.error('Error finding profitable betters:', error);
            return [];
        }
    }

    async analyzeBetters(addresses) {
        const profiles = [];
        
        for (const address of addresses) {
            try {
                const analysis = await this.betterAnalyzer.analyzeBetter(address);
                if (analysis) {
                    profiles.push(analysis);
                }
            } catch (error) {
                console.error(`Error analyzing better ${address}:`, error);
            }
        }

        return profiles;
    }

    async updateRecommendations(strategies) {
        this.recommendations.clear();
        
        for (const strategy of strategies.recommendedStrategies) {
            const key = this.getStrategyKey(strategy);
            this.recommendations.set(key, {
                ...strategy,
                lastUpdated: Date.now()
            });
        }
    }

    getStrategyKey(strategy) {
        return `${strategy.track}-${strategy.betType}-${strategy.riskLevel}`;
    }

    async getRecommendations(options = {}) {
        const {
            track,
            betType,
            riskLevel,
            minConfidence = 0.7,
            limit = 10
        } = options;

        let recommendations = Array.from(this.recommendations.values());

        // Apply filters
        if (track) {
            recommendations = recommendations.filter(r => r.track === track);
        }
        if (betType) {
            recommendations = recommendations.filter(r => r.betType === betType);
        }
        if (riskLevel) {
            recommendations = recommendations.filter(r => r.riskLevel === riskLevel);
        }

        // Filter by confidence and sort
        recommendations = recommendations
            .filter(r => r.confidence >= minConfidence)
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, limit);

        // Apply confidence decay for old recommendations
        return recommendations.map(r => {
            if (Date.now() - r.lastUpdated > this.updateInterval) {
                return {
                    ...r,
                    confidence: r.confidence * 0.9 // 10% confidence decay
                };
            }
            return r;
        });
    }

    async getRecommendationForRace(raceId, options = {}) {
        try {
            // Get race details
            const race = await this.getRaceDetails(raceId);
            if (!race) return null;

            // Get recommendations matching race conditions
            const recommendations = await this.getRecommendations({
                track: race.track,
                ...options
            });

            // Filter and adjust recommendations based on current race conditions
            return this.adjustRecommendationsForRace(recommendations, race);
        } catch (error) {
            console.error('Error getting race recommendations:', error);
            return null;
        }
    }

    async getRaceDetails(raceId) {
        try {
            const raceAccount = await this.connection.getAccountInfo(
                new PublicKey(raceId)
            );

            if (!raceAccount) return null;

            // Parse race account data
            // This would depend on your actual data structure
            return {
                track: raceAccount.data.slice(0, 32).toString().trim(),
                surface: raceAccount.data.slice(32, 64).toString().trim(),
                weather: raceAccount.data.slice(64, 96).toString().trim(),
                condition: raceAccount.data.slice(96, 128).toString().trim()
            };
        } catch (error) {
            console.error('Error fetching race details:', error);
            return null;
        }
    }

    adjustRecommendationsForRace(recommendations, race) {
        return recommendations.map(recommendation => {
            let confidenceAdjustment = 1.0;

            // Adjust confidence based on track condition match
            if (recommendation.patterns.some(p => 
                p.toLowerCase().includes(race.condition.toLowerCase())
            )) {
                confidenceAdjustment *= 1.1;
            }

            // Adjust confidence based on weather match
            if (recommendation.patterns.some(p => 
                p.toLowerCase().includes(race.weather.toLowerCase())
            )) {
                confidenceAdjustment *= 1.1;
            }

            // Adjust confidence based on surface match
            if (recommendation.patterns.some(p => 
                p.toLowerCase().includes(race.surface.toLowerCase())
            )) {
                confidenceAdjustment *= 1.1;
            }

            return {
                ...recommendation,
                confidence: recommendation.confidence * confidenceAdjustment,
                adjustedFor: {
                    weather: race.weather,
                    condition: race.condition,
                    surface: race.surface
                }
            };
        }).sort((a, b) => b.confidence - a.confidence);
    }

    async refreshRecommendations() {
        try {
            const profitableBetters = await this.findProfitableBetters();
            const betterProfiles = await this.analyzeBetters(profitableBetters);
            const strategies = await this.strategyAggregator.aggregateStrategies(betterProfiles);
            await this.updateRecommendations(strategies);
            return true;
        } catch (error) {
            console.error('Error refreshing recommendations:', error);
            return false;
        }
    }
}

module.exports = RecommendationService; 