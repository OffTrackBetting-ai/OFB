const { TwitterApi } = require('twitter-api-v2');
const RecommendationService = require('./recommendation-service');

class TwitterService {
    constructor(config) {
        this.config = config;
        this.client = new TwitterApi({
            appKey: config.TWITTER_API_KEY,
            appSecret: config.TWITTER_API_SECRET,
            accessToken: config.TWITTER_ACCESS_TOKEN,
            accessSecret: config.TWITTER_ACCESS_SECRET,
        });
        this.recommendationService = new RecommendationService(config);
        this.lastTweetTime = new Map();
        this.tweetInterval = config.TWEET_INTERVAL || 3600000; // 1 hour
    }

    async initialize() {
        try {
            await this.recommendationService.initialize();
            console.log('Twitter service initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing Twitter service:', error);
            return false;
        }
    }

    async startTweetingRecommendations() {
        try {
            // Initial tweet
            await this.tweetLatestRecommendations();

            // Schedule regular tweets
            setInterval(async () => {
                await this.tweetLatestRecommendations();
            }, this.tweetInterval);

            return true;
        } catch (error) {
            console.error('Error starting tweet service:', error);
            return false;
        }
    }

    async tweetLatestRecommendations() {
        try {
            const recommendations = await this.recommendationService.getRecommendations({
                minConfidence: 0.8,
                limit: 3
            });

            if (!recommendations || recommendations.length === 0) {
                console.log('No recommendations to tweet');
                return;
            }

            for (const rec of recommendations) {
                const tweetKey = this.getTweetKey(rec);
                const lastTweet = this.lastTweetTime.get(tweetKey);

                // Only tweet if we haven't tweeted this recommendation recently
                if (!lastTweet || Date.now() - lastTweet > this.tweetInterval) {
                    await this.tweetRecommendation(rec);
                    this.lastTweetTime.set(tweetKey, Date.now());
                }
            }
        } catch (error) {
            console.error('Error tweeting recommendations:', error);
        }
    }

    getTweetKey(recommendation) {
        return `${recommendation.track}-${recommendation.betType}-${recommendation.riskLevel}`;
    }

    async tweetRecommendation(recommendation) {
        const tweet = this.formatRecommendationTweet(recommendation);
        
        try {
            await this.client.v2.tweet(tweet);
            console.log('Successfully tweeted recommendation');
        } catch (error) {
            console.error('Error posting tweet:', error);
        }
    }

    formatRecommendationTweet(recommendation) {
        const confidence = Math.round(recommendation.confidence * 100);
        const emoji = this.getConfidenceEmoji(recommendation.confidence);

        let tweet = `🏇 Horse Racing Tip ${emoji}\n\n`;
        tweet += `Track: ${recommendation.track}\n`;
        tweet += `Bet Type: ${recommendation.betType}\n`;
        tweet += `Risk Level: ${recommendation.riskLevel}\n`;
        tweet += `Confidence: ${confidence}%\n\n`;

        // Add relevant patterns/insights
        if (recommendation.patterns && recommendation.patterns.length > 0) {
            const pattern = recommendation.patterns[0]; // Use first pattern
            tweet += `💡 Key Insight: ${this.truncateText(pattern, 50)}\n\n`;
        }

        // Add usage guidelines if available
        if (recommendation.recommendedUsage) {
            const usage = recommendation.recommendedUsage;
            tweet += `📊 Recommended stake: ${Math.round(usage.recommendedStake * 100)}% of bankroll\n`;
            tweet += `Min odds: ${usage.minOdds}x\n`;
        }

        // Add disclaimer
        tweet += `\n⚠️ This is AI-generated analysis. Always bet responsibly.`;

        // Add hashtags
        tweet += `\n\n#HorseRacing #BettingTips #AI`;

        return this.truncateText(tweet, 280); // Twitter's character limit
    }

    getConfidenceEmoji(confidence) {
        if (confidence >= 0.9) return '🔥';
        if (confidence >= 0.8) return '💪';
        if (confidence >= 0.7) return '👍';
        return '🤔';
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength - 3) + '...';
    }

    async tweetRaceRecommendation(raceId) {
        try {
            const recommendation = await this.recommendationService.getRecommendationForRace(
                raceId,
                { minConfidence: 0.8 }
            );

            if (!recommendation) {
                console.log('No recommendation available for this race');
                return;
            }

            const tweet = this.formatRaceRecommendationTweet(recommendation);
            await this.client.v2.tweet(tweet);
            console.log('Successfully tweeted race recommendation');
        } catch (error) {
            console.error('Error tweeting race recommendation:', error);
        }
    }

    formatRaceRecommendationTweet(recommendation) {
        const confidence = Math.round(recommendation.confidence * 100);
        const emoji = this.getConfidenceEmoji(recommendation.confidence);

        let tweet = `🏇 Live Race Tip ${emoji}\n\n`;
        tweet += `Track: ${recommendation.track}\n`;
        
        // Add conditions if available
        if (recommendation.adjustedFor) {
            const conditions = recommendation.adjustedFor;
            tweet += `Conditions: ${conditions.weather}, ${conditions.surface}\n`;
        }

        tweet += `Bet Type: ${recommendation.betType}\n`;
        tweet += `Risk Level: ${recommendation.riskLevel}\n`;
        tweet += `Confidence: ${confidence}%\n\n`;

        // Add key pattern/insight
        if (recommendation.patterns && recommendation.patterns.length > 0) {
            const pattern = recommendation.patterns[0];
            tweet += `💡 Key Insight: ${this.truncateText(pattern, 50)}\n\n`;
        }

        // Add usage guidelines
        if (recommendation.recommendedUsage) {
            const usage = recommendation.recommendedUsage;
            tweet += `📊 Recommended stake: ${Math.round(usage.recommendedStake * 100)}% of bankroll\n`;
        }

        // Add disclaimer
        tweet += `\n⚠️ This is AI-generated analysis. Always bet responsibly.`;

        // Add hashtags
        tweet += `\n\n#HorseRacing #LiveBetting #AI`;

        return this.truncateText(tweet, 280);
    }
}

module.exports = TwitterService; 