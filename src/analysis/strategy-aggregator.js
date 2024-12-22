const Anthropic = require('@anthropic-ai/sdk');

class StrategyAggregator {
    constructor(config) {
        this.config = config;
        this.anthropic = new Anthropic({
            apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY
        });
        this.strategies = new Map();
        this.lastUpdate = new Map();
        this.updateInterval = config.strategyUpdateInterval || 3600000; // 1 hour
    }

    async aggregateStrategies(betterProfiles) {
        try {
            const validProfiles = this.filterValidProfiles(betterProfiles);
            if (validProfiles.length === 0) return null;

            const combinedAnalysis = await this.analyzeMultipleProfiles(validProfiles);
            await this.updateStrategies(combinedAnalysis);

            return combinedAnalysis;
        } catch (error) {
            console.error('Error aggregating strategies:', error);
            return null;
        }
    }

    filterValidProfiles(profiles) {
        return profiles.filter(profile => 
            profile.profitability >= (this.config.minProfitability || 1.5) &&
            profile.totalBets >= (this.config.minBets || 50)
        );
    }

    async analyzeMultipleProfiles(profiles) {
        const prompt = this.constructAggregationPrompt(profiles);
        
        try {
            const message = await this.anthropic.messages.create({
                model: "claude-3-opus-20240229",
                max_tokens: 2000,
                temperature: 0.7,
                system: "You are an expert horse racing analyst specializing in identifying and combining successful betting strategies. Analyze multiple betting profiles to identify common patterns and create optimal betting strategies.",
                messages: [{
                    role: "user",
                    content: prompt
                }]
            });

            return this.processAggregatedAnalysis(message.content[0].text, profiles);
        } catch (error) {
            console.error('Error analyzing multiple profiles:', error);
            return null;
        }
    }

    constructAggregationPrompt(profiles) {
        return `Analyze the following betting profiles from successful horse racing betters:

Better Profiles:
${JSON.stringify(profiles, null, 2)}

Please analyze and provide:
1. Common successful betting patterns
2. Shared track preferences and conditions
3. Consensus bet types and sizing strategies
4. Risk management approaches
5. Key success factors
6. Optimal combined strategies
7. Potential strategy conflicts and resolutions

Focus on identifying patterns that appear across multiple successful betters.
Format your response in a structured way with clear section headers.`;
    }

    processAggregatedAnalysis(response, profiles) {
        const commonPatterns = this.extractCommonPatterns(response);
        const riskProfiles = this.aggregateRiskProfiles(profiles);
        const trackPreferences = this.aggregateTrackPreferences(profiles);
        const betTypes = this.aggregateBetTypes(profiles);

        return {
            timestamp: Date.now(),
            sampleSize: profiles.length,
            averageProfitability: this.calculateAverageProfitability(profiles),
            commonPatterns,
            riskProfiles,
            trackPreferences,
            betTypes,
            recommendedStrategies: this.generateRecommendedStrategies(
                commonPatterns,
                riskProfiles,
                trackPreferences,
                betTypes
            )
        };
    }

    extractCommonPatterns(response) {
        const patterns = {
            betting: [],
            timing: [],
            selection: [],
            management: []
        };

        const sections = response.split('\n\n');
        let currentSection = '';

        for (const section of sections) {
            if (section.includes('Betting Patterns:')) {
                currentSection = 'betting';
            } else if (section.includes('Timing Patterns:')) {
                currentSection = 'timing';
            } else if (section.includes('Selection Patterns:')) {
                currentSection = 'selection';
            } else if (section.includes('Management Patterns:')) {
                currentSection = 'management';
            } else if (section.trim()) {
                switch (currentSection) {
                    case 'betting':
                        patterns.betting.push(section.trim());
                        break;
                    case 'timing':
                        patterns.timing.push(section.trim());
                        break;
                    case 'selection':
                        patterns.selection.push(section.trim());
                        break;
                    case 'management':
                        patterns.management.push(section.trim());
                        break;
                }
            }
        }

        return patterns;
    }

    aggregateRiskProfiles(profiles) {
        const riskCounts = {
            conservative: 0,
            moderate: 0,
            aggressive: 0
        };

        profiles.forEach(profile => {
            const risk = profile.riskProfile.toLowerCase();
            if (riskCounts.hasOwnProperty(risk)) {
                riskCounts[risk]++;
            }
        });

        return Object.entries(riskCounts)
            .map(([profile, count]) => ({
                profile,
                frequency: count / profiles.length,
                count
            }))
            .sort((a, b) => b.frequency - a.frequency);
    }

    aggregateTrackPreferences(profiles) {
        const trackPreferences = new Map();

        profiles.forEach(profile => {
            profile.preferredTracks.forEach(track => {
                const count = trackPreferences.get(track) || 0;
                trackPreferences.set(track, count + 1);
            });
        });

        return Array.from(trackPreferences.entries())
            .map(([track, count]) => ({
                track,
                frequency: count / profiles.length,
                count
            }))
            .sort((a, b) => b.frequency - a.frequency);
    }

    aggregateBetTypes(profiles) {
        const betTypes = new Map();

        profiles.forEach(profile => {
            profile.preferredBetTypes.forEach(type => {
                const count = betTypes.get(type) || 0;
                betTypes.set(type, count + 1);
            });
        });

        return Array.from(betTypes.entries())
            .map(([type, count]) => ({
                type,
                frequency: count / profiles.length,
                count
            }))
            .sort((a, b) => b.frequency - a.frequency);
    }

    calculateAverageProfitability(profiles) {
        const total = profiles.reduce((sum, profile) => sum + profile.profitability, 0);
        return total / profiles.length;
    }

    generateRecommendedStrategies(patterns, riskProfiles, trackPreferences, betTypes) {
        const strategies = [];
        const dominantRisk = riskProfiles[0].profile;
        const topTracks = trackPreferences.slice(0, 3);
        const preferredBets = betTypes.slice(0, 3);

        // Generate strategy combinations
        topTracks.forEach(track => {
            preferredBets.forEach(betType => {
                const relevantPatterns = [
                    ...patterns.betting,
                    ...patterns.timing,
                    ...patterns.selection
                ].filter(pattern => 
                    pattern.toLowerCase().includes(track.track.toLowerCase()) ||
                    pattern.toLowerCase().includes(betType.type.toLowerCase())
                );

                if (relevantPatterns.length > 0) {
                    strategies.push({
                        track: track.track,
                        betType: betType.type,
                        riskLevel: dominantRisk,
                        confidence: (track.frequency + betType.frequency) / 2,
                        patterns: relevantPatterns,
                        recommendedUsage: this.generateUsageGuidelines(
                            dominantRisk,
                            track.frequency,
                            betType.frequency
                        )
                    });
                }
            });
        });

        return strategies.sort((a, b) => b.confidence - a.confidence);
    }

    generateUsageGuidelines(riskLevel, trackFrequency, betTypeFrequency) {
        const confidence = (trackFrequency + betTypeFrequency) / 2;
        const baseStake = riskLevel === 'conservative' ? 0.01 : 
                         riskLevel === 'moderate' ? 0.02 : 0.03;

        return {
            recommendedStake: baseStake * confidence,
            minOdds: riskLevel === 'conservative' ? 1.5 :
                    riskLevel === 'moderate' ? 2.0 : 3.0,
            maxStake: baseStake * confidence * 2,
            stopLoss: baseStake * confidence * 10,
            targetProfit: baseStake * confidence * 20
        };
    }

    async updateStrategies(analysis) {
        this.strategies.clear();
        analysis.recommendedStrategies.forEach(strategy => {
            const key = `${strategy.track}-${strategy.betType}`;
            this.strategies.set(key, {
                ...strategy,
                lastUpdated: Date.now()
            });
        });
    }

    getStrategy(track, betType) {
        const key = `${track}-${betType}`;
        const strategy = this.strategies.get(key);
        
        if (!strategy) return null;
        if (Date.now() - strategy.lastUpdated > this.updateInterval) {
            return {
                ...strategy,
                confidence: strategy.confidence * 0.9 // Decay confidence over time
            };
        }
        
        return strategy;
    }

    getAllStrategies() {
        return Array.from(this.strategies.values())
            .sort((a, b) => b.confidence - a.confidence);
    }
}

module.exports = StrategyAggregator; 