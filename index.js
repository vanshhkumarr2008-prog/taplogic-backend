const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 1. URL Cleaner function
function cleanYoutubeUrl(url) {
    try {
        const u = new URL(url);
        u.search = ''; // Strip all params like ?si= or &t=
        return u.toString();
    } catch (e) { return url; }
}

app.post('/api/analyze', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const videoUrl = cleanYoutubeUrl(url);

    try {
        // 2. Fetch Transcript via RapidAPI
        const transcriptResponse = await axios.request({
            method: 'GET',
            url: 'https://youtube-transcripts.p.rapidapi.com/get_transcript',
            params: { url: videoUrl },
            headers: {
                'X-RapidAPI-Key': process.env.RAPID_API_KEY,
                'X-RapidAPI-Host': 'youtube-transcripts.p.rapidapi.com'
            }
        });

        const transcriptText = transcriptResponse.data.content || "No transcript found.";

        // 3. AI Analysis with Groq (Llama 3.3 70b)
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are an expert Recruitment Analyst. Extract the following details from the video text: 1. Recruitment Name, 2. Online/Offline form, 3. Age Limit, 4. Qualification, 5. Total Vacancies (mention SC category seats), 6. Form Fees (mention SC category fees), 7. Selection Process, 8. Required Documents, 9. Duty Location. If details are missing, say 'Information not available'."
                },
                {
                    role: "user",
                    content: `Analyze this recruitment video text: ${transcriptText}`
                }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" } // Optional, but helps UI
        });

        const aiResult = JSON.parse(chatCompletion.choices[0].message.content);
        
        res.json({
            title: "TapLogic X Analysis",
            ...aiResult,
            source: "transcript"
        });

    } catch (error) {
        console.error("Backend Error:", error.message);
        res.status(500).json({ error: "Server is warming up or busy. Please try again." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`TapLogic Engine running on port ${PORT}`);
});
