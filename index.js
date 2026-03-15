import express from 'express';
import cors from 'cors';
import { YoutubeTranscript } from 'youtube-transcript';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post('/api/analyze', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL missing" });

    try {
        console.log("Fetching transcript for:", url);
        
        // Transcript nikalna (Direct Library se)
        const transcriptArr = await YoutubeTranscript.fetchTranscript(url);
        const transcriptText = transcriptArr.map(t => t.text).join(' ');

        // AI Analysis
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are TapLogic X. Provide a JSON response with:
                    1. title: Video title.
                    2. shortSummary: 2-3 sentence overview.
                    3. detailedExplanation: Point-wise detailed summary.
                    4. type: "recruitment" or "general".
                    5. recruitmentDetails: { recruitmentName, ageLimit, qualification, totalVacancies, scSeats, fees, scFees, dutyPlace } (Fill ONLY if it's a job video, else null).`
                },
                {
                    role: "user",
                    content: `Analyze this transcript: ${transcriptText.substring(0, 12000)}`
                }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(chatCompletion.choices[0].message.content);
        res.json(result);

    } catch (error) {
        console.error("Engine Error:", error.message);
        res.status(500).json({ 
            error: "Analysis Failed", 
            details: error.message 
        });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Universal Engine Live on port ${PORT}`);
});
