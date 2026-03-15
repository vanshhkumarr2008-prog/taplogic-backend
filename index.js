const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// URL Cleaner: YouTube ke faltu parameters hatane ke liye
function cleanUrl(url) {
    try {
        const u = new URL(url);
        return `${u.origin}${u.pathname}${u.searchParams.get('v') ? '?v=' + u.searchParams.get('v') : ''}`;
    } catch (e) { return url; }
}

app.post('/api/analyze', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Video URL is missing" });

    const videoUrl = cleanUrl(url);

    try {
        // 1. Fetch Transcript via RapidAPI
        const transcriptResponse = await axios.request({
            method: 'GET',
            url: 'https://youtube-transcripts.p.rapidapi.com/get_transcript',
            params: { url: videoUrl },
            headers: {
                'X-RapidAPI-Key': process.env.RAPID_API_KEY,
                'X-RapidAPI-Host': 'youtube-transcripts.p.rapidapi.com'
            }
        });

        const transcriptText = transcriptResponse.data.content || "No transcript available.";

        // 2. Powerful AI Analysis (Gemini-Style Universal Prompt)
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are TapLogic X, a high-speed video intelligence AI. 
                    Analyze the transcript and provide a JSON response with:
                    1. title: Catchy video title.
                    2. shortSummary: 2-3 sentence overview.
                    3. detailedExplanation: Detailed breakdown in points.
                    4. type: "recruitment" or "general".
                    5. recruitmentDetails: { recruitmentName, ageLimit, qualification, totalVacancies, scSeats, fees, scFees, dutyPlace } 
                    (Fill recruitmentDetails ONLY if it's a job video, otherwise keep null).
                    Focus on accuracy and clear formatting.`
                },
                {
                    role: "user",
                    content: `Analyze this content: ${transcriptText.substring(0, 15000)}` // Limit text for speed
                }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(chatCompletion.choices[0].message.content);
        res.json(result);

    } catch (error) {
        console.error("Master Error:", error.message);
        res.status(500).json({ error: "TapLogic Engine is warming up. Give it 30 seconds." });
    }
});

// Home route to keep server awake
app.get('/', (req, res) => res.send("TapLogic Engine is Active 🚀"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Master Engine running on port ${PORT}`);
});
