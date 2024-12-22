const Anthropic = require('@anthropic-ai/sdk');
const Race = require('./models/race');

class BettingAnalyzer {
    constructor(config) {
        this.config = config;
        this.anthropic = new Anthropic({
            apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY
        });
        this.betterProfiles = new Map();
        this.raceHistory = new Map();
        this.lastAnalysis = new Map();
    }

    async analyzeBettingPattern(better, races = [], context = {}) {
        try {
            const bettingHistory = await this.getBettingHistory(better);
            const raceAnalysis = await this.analyzeRaces(races);
            const prompt = this.constructPrompt(better, bettingHistory, raceAnalysis, context);
            const analysis = await this.queryModel(prompt);
            return this.processAnalysis(analysis, better, races);
        } catch (error) {
            console.error('Error in betting analysis:', error);
            return null;
        }
    }

    async getBettingHistory(better) {
        // Get betting history from Solana blockchain
        const history = await this.fetchBettingHistory(better);
        return this.processBettingHistory(history);
    }

    async fetchBettingHistory(better) {
        try {
            const signatures = await this.connection.getSignaturesForAddress(
                new PublicKey(better),
                { limit: 1000 }
            );

            const transactions = await Promise.all(
                signatures.map(sig => this.connection.getParsedTransaction(sig.signature))
            );

            return transactions.filter(tx => this.isBettingTransaction(tx));
        } catch (error) {
            console.error('Error fetching betting history:', error);
            return [];
        }
    }

    isBettingTransaction(transaction) {
        if (!transaction?.meta) return false;
        // Add logic to identify betting transactions
        // This would depend on your smart contract structure
        return false;
    }

    async analyzeRaces(races) {
        const analysis = [];
        for (const race of races) {
            const raceData = {
                track: race.track,
                distance: race.distance,
                surface: race.surface,
                weather: race.weather,
                trackCondition: race.trackCondition,
                horses: race.horses.map(horse => ({
                    id: horse.id,
                    name: horse.name,
                    odds: race.getCurrentOdds(horse.id),
                    pastPerformance: horse.pastPerformance
                }))
            };
            analysis.push(raceData);
        }
        return analysis;
    }

    constructPrompt(better, bettingHistory, raceAnalysis, context) {
        return `\n\nHuman: As a horse racing betting analyst, analyze the following data:

Better Profile:
${JSON.stringify(better, null, 2)}

Betting History:
${JSON.stringify(bettingHistory, null, 2)}

Race Analysis:
${JSON.stringify(raceAnalysis, null, 2)}

Market Context:
- Track Conditions: ${context.trackConditions || 'Unknown'}
- Weather Impact: ${context.weatherImpact || 'Unknown'}
- Race Class Level: ${context.raceClass || 'Unknown'}

Please analyze and provide:
1. Betting Strategy Classification
2. Risk Assessment
3. Track & Surface Preferences
4. Success Probability for Current Conditions
5. Recommended Betting Actions
6. Risk Mitigation Suggestions

Format your response in a structured way with clear section headers.`;
    }

    async queryModel(prompt) {
        try {
            const message = await this.anthropic.messages.create({
                model: "claude-3-opus-20240229",
                max_tokens: 1500,
                temperature: 0.7,
                system: "You are an expert horse racing analyst with deep knowledge of betting patterns, race analysis, and risk assessment. You provide detailed, structured insights based on historical data and current conditions.",
                messages: [{
                    role: "user",
                    content: prompt
                }]
            });

            return message.content[0].text;
        } catch (error) {
            console.error('Error querying Claude:', error);
            throw error;
        }
    }

    processAnalysis(analysis, better, races) {
        const insights = this.extractInsights(analysis);
        const validatedInsights = this.validateInsights(insights, better, races);
        const confidenceScores = this.calculateConfidence(validatedInsights, better, races);

        return {
            bettingStrategy: validatedInsights.strategy,
            riskLevel: validatedInsights.riskLevel,
            trackPreferences: validatedInsights.trackPreferences,
            successProbability: confidenceScores.successProbability,
            recommendedBets: validatedInsights.recommendedBets,
            confidence: confidenceScores.overall,
            timestamp: Date.now()
        };
    }

    extractInsights(analysis) {
        const lines = analysis.split('\n');
        const insights = {
            strategy: '',
            riskLevel: '',
            trackPreferences: [],
            recommendedBets: []
        };

        let currentSection = '';
        for (const line of lines) {
            if (line.includes('Betting Strategy:')) {
                currentSection = 'strategy';
                insights.strategy = line.split(':')[1].trim();
            } else if (line.includes('Risk Assessment:')) {
                currentSection = 'risk';
                insights.riskLevel = line.split(':')[1].trim();
            } else if (line.includes('Track Preferences:')) {
                currentSection = 'tracks';
            } else if (line.includes('Recommended Bets:')) {
                currentSection = 'bets';
            } else if (line.trim() && currentSection === 'tracks') {
                insights.trackPreferences.push(line.trim());
            } else if (line.trim() && currentSection === 'bets') {
                insights.recommendedBets.push(line.trim());
            }
        }

        return insights;
    }

    validateInsights(insights, better, races) {
        const validated = { ...insights };

        // Validate strategy against historical performance
        const betterProfile = this.betterProfiles.get(better);
        if (betterProfile?.successRate) {
            if (betterProfile.successRate < 0.4 && insights.strategy.includes('aggressive')) {
                validated.strategy = 'conservative ' + insights.strategy;
            }
        }

        // Validate track preferences against current conditions
        const currentRace = races[0];
        if (currentRace) {
            const matchingPreference = insights.trackPreferences.find(pref => 
                pref.includes(currentRace.surface) || pref.includes(currentRace.trackCondition)
            );
            if (!matchingPreference) {
                validated.riskLevel = 'high';
            }
        }

        return validated;
    }

    calculateConfidence(insights, better, races) {
        const scores = {
            strategy: this.calculateStrategyConfidence(insights.strategy, better),
            track: this.calculateTrackConfidence(insights.trackPreferences, races),
            conditions: this.calculateConditionsConfidence(races),
            overall: 0
        };

        scores.overall = (
            scores.strategy * 0.4 +
            scores.track * 0.3 +
            scores.conditions * 0.3
        );

        scores.successProbability = this.calculateSuccessProbability(scores.overall, better);

        return scores;
    }

    calculateStrategyConfidence(strategy, better) {
        const profile = this.betterProfiles.get(better);
        if (!profile?.bettingHistory) return 0.5;

        const successRate = profile.bettingHistory.wins / profile.bettingHistory.total;
        const isAggressive = strategy.includes('aggressive');
        const isSuccessful = successRate > 0.4;

        return isAggressive === isSuccessful ? 0.8 : 0.4;
    }

    calculateTrackConfidence(preferences, races) {
        if (!races.length || !preferences.length) return 0.5;

        const currentRace = races[0];
        const matchingPreferences = preferences.filter(pref =>
            pref.includes(currentRace.surface) || 
            pref.includes(currentRace.trackCondition)
        );

        return matchingPreferences.length / preferences.length;
    }

    calculateConditionsConfidence(races) {
        if (!races.length) return 0.5;

        const race = races[0];
        let confidence = 0.5;

        // Adjust confidence based on weather and track condition clarity
        if (race.weather && race.weather !== 'unknown') confidence += 0.1;
        if (race.trackCondition && race.trackCondition !== 'unknown') confidence += 0.1;
        if (race.horses.every(horse => race.getCurrentOdds(horse.id))) confidence += 0.2;

        return Math.min(confidence, 1.0);
    }

    calculateSuccessProbability(confidence, better) {
        const profile = this.betterProfiles.get(better);
        const historicalSuccess = profile?.bettingHistory ? 
            profile.bettingHistory.wins / profile.bettingHistory.total : 
            0.5;

        return (historicalSuccess * 0.7 + confidence * 0.3);
    }
}

module.exports = BettingAnalyzer; 