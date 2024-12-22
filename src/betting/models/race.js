class Race {
    constructor(data) {
        this.id = data.id;
        this.track = data.track;
        this.date = data.date;
        this.time = data.time;
        this.distance = data.distance;
        this.surface = data.surface;
        this.purse = data.purse;
        this.horses = data.horses || [];
        this.odds = data.odds || {};
        this.weather = data.weather;
        this.trackCondition = data.trackCondition;
        this.status = data.status || 'scheduled'; // scheduled, in_progress, completed, cancelled
        this.results = data.results || [];
    }

    addHorse(horse) {
        if (!this.horses.find(h => h.id === horse.id)) {
            this.horses.push(horse);
        }
    }

    updateOdds(horseId, newOdds) {
        this.odds[horseId] = {
            value: newOdds,
            timestamp: Date.now()
        };
    }

    setResults(results) {
        this.results = results.map(result => ({
            position: result.position,
            horseId: result.horseId,
            time: result.time,
            marginOfVictory: result.marginOfVictory
        }));
        this.status = 'completed';
    }

    getHorseById(horseId) {
        return this.horses.find(horse => horse.id === horseId);
    }

    getCurrentOdds(horseId) {
        return this.odds[horseId] || null;
    }

    getWinner() {
        if (this.status !== 'completed' || !this.results.length) return null;
        return this.results.find(result => result.position === 1);
    }

    toJSON() {
        return {
            id: this.id,
            track: this.track,
            date: this.date,
            time: this.time,
            distance: this.distance,
            surface: this.surface,
            purse: this.purse,
            horses: this.horses,
            odds: this.odds,
            weather: this.weather,
            trackCondition: this.trackCondition,
            status: this.status,
            results: this.results
        };
    }
}

module.exports = Race; 