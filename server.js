const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const WORKFLOW_ID = "cmoxgru79000hl804k194cbl6";
const NODE_ID = "node_1778277941908_request";
const GALAXY_API = "https://api.galaxy.ai/api/v1";
const GALAXY_KEY = process.env.GALAXY_API_KEY;

app.use(cors({
  origin: ['https://quesmarket58.github.io', 'http://localhost:3000', 'http://127.0.0.1:5500'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    status: 'Ques Creator Studio Backend running!', 
    version: '5.0.0',
    workflow: WORKFLOW_ID,
    duration: '15 seconds'
  });
});

app.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    if (!GALAXY_KEY) return res.status(500).json({ error: 'Galaxy AI API key not configured' });

    const payload = {
      workflowId: WORKFLOW_ID,
      values: {
        [NODE_ID]: {
          text_to_video: prompt,
          duration: 15,
          video_field: []
        }
      }
    };

    console.log('Starting 15s video generation:', prompt.substring(0, 80));

    const response = await fetch(`${GALAXY_API}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GALAXY_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Galaxy AI response:', JSON.stringify(data).substring(0, 200));

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Galaxy AI request failed', details: data });
    }

    const runId = data.id || data.runId;
    console.log('Run started! ID:', runId);
    res.json({ runId, status: 'started' });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/result/:runId', async (req, res) => {
  try {
    const { runId } = req.params;
    if (!GALAXY_KEY) return res.status(500).json({ error: 'Galaxy AI API key not configured' });

    const response = await fetch(`${GALAXY_API}/runs/${runId}?inDetails=true`, {
      headers: { 'Authorization': `Bearer ${GALAXY_KEY}` }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Failed to get result' });
    }

    console.log('Poll status:', data.status);

    let videoUrl = null;
    if (data.status === 'COMPLETED') {
      const responseStr = JSON.stringify(data);
      const urlMatch = responseStr.match(/https:\/\/galaxy-prod\.tlcdn\.com\/[^"]+\.mp4/);
      if (urlMatch) videoUrl = urlMatch[0];

      if (!videoUrl) {
        videoUrl = data.output?.video ||
                   data.output?.url ||
                   data.output?.video_url ||
                   data.output?.[0];
      }
      console.log('Video URL found:', videoUrl ? 'YES' : 'NO');
      if (!videoUrl) console.log('Full output:', JSON.stringify(data.output));
    }

    res.json({ status: data.status, videoUrl, runId });

  } catch (err) {
    console.error('Poll error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Ques Creator Studio Backend v5.0 running on port ${PORT}`);
  console.log(`Workflow: ${WORKFLOW_ID} — Duration: 15 seconds`);
});
