const { HorseBettingAnalyzer } = require('./ai/HorseBettingAnalyzer');
const { 
    ANTHROPIC_API_KEY,
    MIN_BET_AMOUNT,
    MAX_BET_AMOUNT 
} = require('../config.json');

class OffTrackBetting {
    constructor() {
        // Initialize AI analyzer
        this.analyzer = new HorseBettingAnalyzer({
            apiKey: ANTHROPIC_API_KEY,
            minBet: MIN_BET_AMOUNT,
            maxBet: MAX_BET_AMOUNT
        });
        
        this.activeRaces = new Map();
        this.bettingPatterns = new Map();
    }

    async init() {
        try {
            console.log('Initializing Off Track Betting system...');
            
            // Initialize race data listener
            await this.initRaceDataListener();
            
            // Initialize betting pattern analyzer
            await this.initPatternAnalyzer();
            
            console.log('Off Track Betting system initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Off Track Betting system:', error);
            throw error;
        }
    }

    async initRaceDataListener() {
        // Initialize race data feed
        this.raceDataInterval = setInterval(() => {
            this.updateRaceData();
        }, 60000); // Update every minute
        
        console.log('Race data listener initialized');
    }

    async initPatternAnalyzer() {
        try {
            // Load historical betting patterns from database/file
            await this.loadHistoricalPatterns();
            
            // Start pattern analysis loop
            this.analysisInterval = setInterval(() => {
                this.analyzeBettingPatterns();
            }, 300000); // Analyze every 5 minutes
            
            console.log('Pattern analyzer initialized');
        } catch (error) {
            console.error('Failed to initialize pattern analyzer:', error);
            throw error;
        }
    }

    async updateRaceData() {
        try {
            // Update active races and their conditions
            for (const [raceId, raceData] of this.activeRaces) {
                // Update race conditions, odds, etc.
                await this.analyzer.analyzeRaceConditions(raceData);
            }
        } catch (error) {
            console.error('Error updating race data:', error);
        }
    }

    async analyzeBettingPatterns() {
        try {
            for (const [bettorId, pattern] of this.bettingPatterns) {
                const analysis = await this.analyzer.analyzeBettingPattern(pattern);
                await this.updateBettingStrategy(bettorId, analysis);
            }
        } catch (error) {
            console.error('Error analyzing betting patterns:', error);
        }
    }

    async loadHistoricalPatterns() {
        // TODO: Implement loading historical betting patterns from database
        console.log('Historical patterns loaded');
    }

    async updateBettingStrategy(bettorId, analysis) {
        // TODO: Update betting strategies based on AI analysis
        console.log(`Updated strategy for bettor ${bettorId}`);
    }

    async cleanup() {
        // Clear intervals
        clearInterval(this.raceDataInterval);
        clearInterval(this.analysisInterval);
        
        // Close any open connections
        this.activeRaces.clear();
        this.bettingPatterns.clear();
        
        console.log('Cleanup completed');
    }
}

// Create and initialize the system
const offTrackBetting = new OffTrackBetting();
offTrackBetting.init().catch(error => {
    console.error('Failed to start Off Track Betting system:', error);
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down Off Track Betting system...');
    await offTrackBetting.cleanup();
    process.exit(0);
});

module.exports = offTrackBetting;