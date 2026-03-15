import express from 'express';
import cors from 'cors';
import * as YoutubeTranscriptModule from 'youtube-transcript'; // Star import use kiya hai
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Library handle karne ka naya tareeka
const YoutubeTranscript = YoutubeTranscriptModule.default || YoutubeTranscriptModule.YoutubeTranscript || YoutubeTranscriptModule;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post('/api/analyze', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL missing" });

    try {
        console.log("Fetching transcript for:", url);
        
        // Transcript nikalne ka robust tareeka
        const fetcher = YoutubeTranscript.fetchTranscript || YoutubeTranscript.default?.fetchTranscript;
        if (!fetcher) throw new Error("Transcript fetcher not found in library");

        const transcriptArr = await fetcher(url);
        const transcriptText = transcriptArr.map(t => t.text).join(' ');

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are TapLogic X. Provide a JSON response with title, shortSummary, detailedExplanation, and type.`
                },
                {
                    role: "user",
                    content: `Analyze this transcript: ${transcriptText.substring(0, 12000)}`
                }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        res.json(JSON.parse(chatCompletion.choices[0].message.content));

    } catch (error) {
        console.error("Engine Error:", error.message);
        res.status(500).json({ error: "Analysis Failed", details: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Universal Engine Live on port ${PORT}`);
});
