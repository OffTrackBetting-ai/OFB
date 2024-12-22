# Off Track Betting Advisor

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

## Configuration

The application can be configured through the `config.json` file:

```json
{
    "AI_CONFIG": {
        "modelEndpoint": "claude-3-opus-20240229",
        "minConfidence": 0.75,
        "historicalDataDays": 30,
        "analysisUpdateInterval": 300
    },
    "RECOMMENDATION_CONFIG": {
        "maxRecommendationsPerRace": 3,
        "minConfidenceThreshold": 0.7,
        "riskLevels": ["conservative", "moderate", "aggressive"],
        "recommendationTypes": ["win", "place", "show", "exacta", "trifecta"],
        "updateInterval": 60
    },
    "RACE_CONFIG": {
        "minHorsesPerRace": 5,
        "maxHorsesPerRace": 20,
        "trackTypes": ["dirt", "turf", "synthetic"],
        "distanceUnits": "furlongs",
        "maxRaceLength": 12
    },
    "MONITORING": {
        "raceMonitorInterval": 30,
        "oddsMonitorInterval": 15,
        "analysisRefreshInterval": 300,
        "maxMonitoredRaces": 100
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
   - Load historical race data
   - Start AI analysis system using Claude 3
   - Begin monitoring races and odds
   - Generate betting recommendations

## Architecture

The platform consists of several key components:

1. **Race Model (`src/betting/models/race.js`)**
   - Race data structure and management
   - Horse and odds tracking
   - Results handling
   - Track condition monitoring

2. **Betting Analyzer (`src/betting/analyzer.js`)**
   - Integrates with Claude 3 Opus for analysis
   - Processes racing patterns and historical data
   - Generates betting recommendations
   - Calculates success probabilities
   - Risk assessment

3. **Recommendation Manager (`src/betting/recommendations.js`)**
   - Strategy generation
   - Odds analysis
   - Risk level assessment
   - Success probability calculations
   - Historical performance tracking

## Recommendation System

The platform provides detailed betting recommendations:

```javascript
// Initialize recommendation manager
const recommendationManager = new RecommendationManager(config);

// Get recommendations for a race
const recommendations = await recommendationManager.getRecommendations({
    raceId: race.id,
    riskLevel: 'moderate',
    confidenceThreshold: 0.75
});

// Get detailed analysis for a specific horse
const analysis = await recommendationManager.analyzeHorse({
    raceId: race.id,
    horseId: horse.id,
    includeHistoricalPerformance: true
});
```

## AI Analysis

The platform uses Claude 3 Opus for advanced race analysis:

```javascript
const analyzer = new BettingAnalyzer({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// Get comprehensive race analysis
const analysis = await analyzer.analyzeRace(
    race,
    {
        trackConditions: 'fast',
        weatherImpact: 'clear',
        raceClass: 'stakes',
        includeHistoricalData: true
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

## Race Management

The platform includes comprehensive race tracking and analysis:

```javascript
const race = new Race({
    track: 'Churchill Downs',
    distance: '6f',
    surface: 'dirt',
    purse: 50000,
    horses: [...],
    weather: 'clear',
    trackCondition: 'fast'
});

// Track odds changes
race.trackOddsMovement(horseId, newOdds);

// Analyze results
const resultAnalysis = await race.analyzeResults([
    { position: 1, horseId: 'horse1', time: '1:10.5' },
    { position: 2, horseId: 'horse2', time: '1:10.8' }
]);
```

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