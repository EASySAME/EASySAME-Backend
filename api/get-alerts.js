const axios = require('axios');

const USER_AGENT = 'EasySAMEApp/1.0 (graisonparkhurst1@gmail.com)'; // IMPORTANT: CHANGE THIS TO YOUR ACTUAL USER_AGENT!

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://easysame.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    const { lat, lon } = req.query;

    if (!lat || !lon) {
        return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }

    try {
        const pointUrl = `https://api.weather.gov/points/${lat},${lon}`;
        console.log(`Attempting to fetch NWS points from: ${pointUrl}`); // Added log
        const pointResponse = await axios.get(pointUrl, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/ld+json'
            }
        });

        // *** ADD THESE NEW CONSOLE.LOGS HERE ***
        console.log('NWS /points API Call Successful. Response Status:', pointResponse.status);
        console.log('NWS /points API Raw Response Data:', JSON.stringify(pointResponse.data, null, 2));
        // *** END NEW CONSOLE.LOGS ***


        const forecastZoneUrl = pointResponse.data.forecastZone;

        if (!forecastZoneUrl) {
            return res.status(404).json({ error: 'Forecast zone not found for given coordinates.' });
        }

        const alertsUrl = `https://api.weather.gov/alerts/active/zone/${forecastZoneUrl.split('/').pop()}`;
        console.log(`Attempting to fetch NWS alerts from: ${alertsUrl}`); // Added log
        const alertsResponse = await axios.get(alertsUrl, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/ld+json'
            }
        });

        const activeAlerts = alertsResponse.data.features.map(feature => {
            const props = feature.properties;
            return {
                id: feature.id,
                event: props.event,
                headline: props.headline,
                description: props.description,
                areaDesc: props.areaDesc,
                severity: props.severity,
                effective: props.effective,
                expires: props.expires,
                senderName: props.senderName,
                status: props.status
            };
        });

        res.status(200).json({ alerts: activeAlerts });

    } catch (error) {
        console.error('Error fetching NWS alerts (in catch block):', error.message);
        if (error.response) {
            console.error('NWS API response error details (status, data):', error.response.status, JSON.stringify(error.response.data, null, 2));
            return res.status(error.response.status).json({ error: 'Error from NWS API', details: error.response.data });
        } else if (error.request) {
            console.error('NWS API request error (no response received):', error.request);
            return res.status(500).json({ error: 'No response from NWS API' });
        } else {
            console.error('Unexpected error (not response or request error):', error); // Log full error object
            return res.status(500).json({ error: 'An unexpected error occurred.' });
        }
    }
};
