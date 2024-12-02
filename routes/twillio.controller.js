const twilio = require('twilio');
const WebSocket = require('ws');
const fetch = require('axios');
const wsServer = new WebSocket.Server({ noServer: true });

const { TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, TWILIO_TWIML_APP_SID, TWILIO_PHONE_NUMBER,OPENAI_API_KEY } = process.env;
const { VoiceResponse } = twilio.twiml;

// Twilio Client Setup
const client = twilio(TWILIO_API_KEY, TWILIO_API_SECRET, { accountSid: TWILIO_ACCOUNT_SID });



exports.calling = async (req, res) => {
    const { phoneNumber } = req.body;
    try {
        const call = await client.calls.create({
            to: phoneNumber,
            from: TWILIO_PHONE_NUMBER,
            // twiml: `<Response>
            //             <Start>
            //                 <Stream url="${process.env.STREAM_URL}" />
            //             </Start>
            //             <Say>Connecting you to customer care.</Say>
            //         </Response>`,
            url: process.env.STREAM_URL,
            applicationSid: TWILIO_TWIML_APP_SID,
        });
        res.status(200).json({ success: true, callSid: call.sid });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


// Handle Twilio Stream Webhook
exports.twillioWebhook = (req, res) => {
    console.log('Received data:', req.body);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say("listen start");

    try {
        // If the body contains expected audio data
        if (req.body && req.body.Media) {
            const audioData = req.body.Media; // Assuming Media holds the audio stream

            if (audioData && webSocketClient) {
                // Send audio stream to WebSocket client
                webSocketClient.send(audioData);
                console.log('Sent audio to WebSocket client');
                return res.sendStatus(200);
            } else {
                console.error('Audio data or WebSocket client is missing');
                return res.status(400).json({ success: false, error: 'Audio data or WebSocket client missing' });
            }
        } else {
            console.error('Received unexpected data format');
            return res.status(400).json({ success: false, error: 'Invalid data format received' });
        }
    } catch (err) {
        console.error('Error processing request:', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
}


// Handle Streaming and AI Interaction
exports.chat =  async (req, res) => {
    const { audio } = req.body; // Receive audio data from Twilio

    try {
        const response = await axios('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [{ role: 'user', content: `Transcribe and respond: ${audio}` }],
            }),
        });

        const data = await response.json();
        res.json({ response: data.choices[0].message.content });
    } catch (err) {
        console.error('Error with ChatGPT:', err);
        res.status(500).json({ success: false, error: err.message });
    }
}