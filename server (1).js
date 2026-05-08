const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Galaxy AI Kling v3 Pro Video Workflow
const WORKFLOW_ID = "cmow7m74y0000l504oam1x5wd";
const NODE_ID = "node_1778202095086_request";
const GALAXY_API = "https://app.galaxy.ai/api/v1";
const GALAXY_KEY = process.env.GALAXY_API_KEY;

app.use(cors({
  origin: ['https://quesmarket58.github.io', 'http://localhost:3000', 'http://127.0.0.1:5500'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'Ques Creator Studio Backend is running!', 
    version: '3.0.0',
    model: 'Kling v3 Pro',
    workflow: WORKFLOW_ID
  });
});

// Generate horror video
app.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    if (!GALAXY_KEY) return res.status(500).json({ error: 'Galaxy AI API key not configured' });

    const payload = {
      workflowId: WORKFLOW_ID,
      values: {
        [NODE_ID]: {
          prompt: prompt
        }
      }
    };

    console.log('Starting video generation:', prompt.substring(0, 80));

    const response = await fetch(`${GALAXY_API}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GALAXY_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Galaxy AI error:', data);
      return res.status(response.status).json({ error: data.message || 'Galaxy AI request failed', details: data });
    }

    const runId = data.id || data.runId;
    console.log('Video run started! ID:', runId);
    res.json({ runId, status: 'started' });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Poll for result
app.get('/result/:runId', async (req, res) => {
  try {
    const { runId } = req.params;
    if (!GALAXY_KEY) return res.status(500).json({ error: 'Galaxy AI API key not configured' });

    const response = await fetch(`${GALAXY_API}/runs/${runId}?inDetails=true`, {
      headers: { 'Authorization': `Bearer ${GALAXY_KEY}` }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Failed to get result', details: data });
    }

    console.log('Poll status:', data.status);

    let videoUrl = null;
    if (data.status === 'COMPLETED') {
      // Try different paths for video URL
      videoUrl = data.output?.video ||
                 data.output?.url ||
                 data.output?.video_url ||
                 data.output?.[0]?.url ||
                 data.output?.[0] ||
                 data.nodeRuns?.[0]?.output?.video ||
                 data.nodeRuns?.[0]?.output?.url ||
                 data.nodeRuns?.[0]?.output?.video_url;

      if (!videoUrl && Array.isArray(data.output)) videoUrl = data.output[0];

      console.log('Video URL found:', videoUrl ? 'YES' : 'NO');
      if (!videoUrl) {
        console.log('Full output:', JSON.stringify(data.output));
        console.log('Node runs:', JSON.stringify(data.nodeRuns));
      }
    }

    res.json({ status: data.status, videoUrl, runId, raw: data });

  } catch (err) {
    console.error('Poll error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Ques Creator Studio Backend v3.0 running on port ${PORT}`);
  console.log(`Kling v3 Pro Workflow ID: ${WORKFLOW_ID}`);
});
