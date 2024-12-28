# Off Track Betting

[![Twitter Follow](https://img.shields.io/twitter/follow/OFBSOL?style=social)](https://twitter.com/OFBSOL)

Off Track Betting Advisor is an AI-powered horse racing analysis platform that leverages Claude 3 Opus to analyze racing patterns and provide intelligent betting recommendations. The platform focuses on analyzing race conditions, historical performance, and current factors to suggest optimal betting strategies.

## Features

- AI-powered horse race analysis using Claude 3 Opus
- Real-time odds monitoring and analysis
- Multiple bet type recommendations (win, place, show, exacta, trifecta)
- Track condition impact analysis
- Weather impact assessment
- Historical performance analysis
- Risk assessment and management
- Comprehensive race monitoring
- Betting pattern recognition
- Success probability calculations
- Automated Twitter updates with betting recommendations

## Prerequisites

- Node.js >= 16.0.0
- Anthropic API key for Claude 3 Opus
- Twitter API credentials
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/off-track-betting-advisor.git
cd off-track-betting-advisor
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file with:
```env
ANTHROPIC_API_KEY=your_api_key_here
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_SECRET=your_twitter_access_secret
```

## Configuration

The application can be configured through the `config.json` file:

```json
{
    "AI_CONFIG": {
        "modelEndpoint": "claude-3-opus-20240229",
        "minConfidence": 0.7,
        "historicalDataDays": 30,
        "riskTolerance": "moderate"
    },
    "TWITTER_CONFIG": {
        "TWEET_INTERVAL": 3600000
    },
    "RECOMMENDATION_CONFIG": {
        "minConfidence": 0.8,
        "updateInterval": 300000,
        "maxRecommendationsPerTweet": 3
    },
    "RACE_CONFIG": {
        "trackTypes": ["dirt", "turf", "synthetic"],
        "distanceUnits": "furlongs"
    }
}
```

## Usage

1. Start the analysis system:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

2. The application will:
   - Initialize the AI analysis system
   - Start monitoring races and odds
   - Begin generating betting recommendations
   - Automatically tweet recommendations based on configured intervals

## Twitter Integration

The platform automatically tweets betting recommendations with:
- Track information and conditions
- Bet type recommendations
- Risk level assessment
- Confidence scores
- Key insights and patterns
- Usage guidelines
- Responsible betting disclaimers

Example tweet format:
```
🏇 Horse Racing Tip 💪

Track: Churchill Downs
Bet Type: Exacta
Risk Level: Moderate
Confidence: 85%

💡 Key Insight: Strong performance pattern in similar track conditions

📊 Recommended stake: 2% of bankroll
Min odds: 3.5x

⚠️ This is AI-generated analysis. Always bet responsibly.

#HorseRacing #BettingTips #AI
```

## Recommendation System

The platform provides detailed betting recommendations through its API:

```javascript
// Initialize recommendation service
const recommendationService = new RecommendationService(config);

// Get general recommendations
const recommendations = await recommendationService.getRecommendations({
    track: 'Churchill Downs',
    betType: 'exacta',
    riskLevel: 'moderate',
    minConfidence: 0.75
});

// Get recommendations for a specific race
const raceRecommendations = await recommendationService.getRecommendationForRace(
    raceId,
    {
        minConfidence: 0.8,
        riskLevel: 'conservative'
    }
);
```

## AI Analysis

The platform uses Claude 3 Opus for advanced race analysis:

```javascript
const analyzer = new BettingAnalyzer(config);

// Analyze betting patterns
const analysis = await analyzer.analyzePattern(
    bettingHistory,
    {
        includeHistoricalData: true,
        riskTolerance: 'moderate'
    }
);
```

The AI system provides:
- Detailed race analysis
- Horse performance predictions
- Track & surface impact assessment
- Weather impact analysis
- Odds movement analysis
- Risk level assessment
- Success probability calculations
- Historical pattern recognition

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This software is for educational and research purposes only. The betting recommendations provided are based on historical data and AI analysis but do not guarantee success. Users are responsible for their own betting decisions and should comply with all applicable laws and regulations. The creators are not responsible for any financial losses incurred through the use of this software. 
