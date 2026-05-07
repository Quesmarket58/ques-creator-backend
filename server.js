const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const WORKFLOW_ID = "cmovocrto00001104ticps9hg";
const NODE_ID = "node_1778169742273_request";
const GALAXY_API = "https://app.galaxy.ai/api/v1";
const GALAXY_KEY = process.env.GALAXY_API_KEY;

app.use(cors({
  origin: ['https://quesmarket58.github.io', 'http://localhost:3000', 'http://127.0.0.1:5500'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Ques Creator Studio Backend is running!', version: '2.0.0', workflow: WORKFLOW_ID });
});

app.post('/generate', async (req, res) => {
  try {
    const { prompt, image_size } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    if (!GALAXY_KEY) return res.status(500).json({ error: 'Galaxy AI API key not configured' });

    const sizeMap = {
      '1024x1024': '1:1',
      '1344x768': '4:3',
      '768x1344': '3:4',
      '1216x832': '16:9',
    };

    const galaxySize = sizeMap[image_size] || image_size || '1:1';

    const payload = {
      workflowId: WORKFLOW_ID,
      values: {
        [NODE_ID]: {
          prompt: prompt,
          image_size: galaxySize
        }
      }
    };

    console.log('Starting generation:', prompt.substring(0, 80));
    console.log('Size:', galaxySize);

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
      return res.status(response.status).json({ error: data.message || 'Failed to get result', details: data });
    }

    console.log('Poll status:', data.status);

    let imageUrl = null;
    if (data.status === 'COMPLETED') {
      imageUrl = data.output?.image ||
                 data.output?.url ||
                 data.output?.images?.[0] ||
                 data.output?.[0]?.url ||
                 data.output?.[0] ||
                 data.nodeRuns?.[0]?.output?.image ||
                 data.nodeRuns?.[0]?.output?.url ||
                 data.nodeRuns?.[0]?.output?.images?.[0];

      if (!imageUrl && Array.isArray(data.output)) imageUrl = data.output[0];

      console.log('Image URL found:', imageUrl ? 'YES' : 'NO');
      if (!imageUrl) {
        console.log('Full output:', JSON.stringify(data.output));
        console.log('Node runs:', JSON.stringify(data.nodeRuns));
      }
    }

    res.json({ status: data.status, imageUrl, runId, raw: data });

  } catch (err) {
    console.error('Poll error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Ques Creator Studio Backend v2.0 running on port ${PORT}`);
  console.log(`Workflow ID: ${WORKFLOW_ID}`);
});
