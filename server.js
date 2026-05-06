const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow requests from your GitHub Pages site
app.use(cors({
  origin: [
    'https://quesmarket58.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:5500'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const GALAXY_API = 'https://app.galaxy.ai/api/v1';
const GALAXY_KEY = process.env.GALAXY_API_KEY;

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Ques Creator Studio Backend is running!', version: '1.0.0' });
});

// ── Generate image ────────────────────────────────────────
app.post('/generate', async (req, res) => {
  try {
    const { prompt, nodeType, subModelId, input } = req.body;

    if (!prompt && !input) {
      return res.status(400).json({ error: 'Prompt or input is required' });
    }

    if (!GALAXY_KEY) {
      return res.status(500).json({ error: 'Galaxy AI API key not configured on server' });
    }

    // Build the request to Galaxy AI
    const galaxyPayload = {
      input: input || {
        prompt: prompt,
        negative_prompt: 'blurry, low quality, watermark, text, ugly, distorted',
        width: req.body.width || 1024,
        height: req.body.height || 1024,
        num_inference_steps: 30,
        guidance_scale: 7.5
      }
    };

    if (subModelId) {
      galaxyPayload.subModelId = subModelId;
    }

    // Add webhook for async completion (optional)
    const webhookUrl = req.body.webhookUrl;
    if (webhookUrl) {
      galaxyPayload.webhook = {
        url: webhookUrl,
        events: ['run.completed', 'run.failed']
      };
    }

    const node = nodeType || 'image-generator';

    console.log(`Generating with node: ${node}`);
    console.log(`Prompt: ${prompt}`);

    const response = await fetch(`${GALAXY_API}/nodes/${node}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GALAXY_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(galaxyPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Galaxy AI error:', data);
      return res.status(response.status).json({ error: data.message || 'Galaxy AI request failed', details: data });
    }

    console.log('Run started:', data.runId);
    res.json({ runId: data.runId, status: 'started' });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Poll for result ───────────────────────────────────────
app.get('/result/:runId', async (req, res) => {
  try {
    const { runId } = req.params;

    if (!GALAXY_KEY) {
      return res.status(500).json({ error: 'Galaxy AI API key not configured' });
    }

    const response = await fetch(`${GALAXY_API}/nodes/runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${GALAXY_KEY}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Failed to get result', details: data });
    }

    res.json(data);

  } catch (err) {
    console.error('Poll error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── List available system workflows ──────────────────────
app.get('/workflows', async (req, res) => {
  try {
    if (!GALAXY_KEY) {
      return res.status(500).json({ error: 'Galaxy AI API key not configured' });
    }

    const response = await fetch(`${GALAXY_API}/system-workflows`, {
      headers: {
        'Authorization': `Bearer ${GALAXY_KEY}`
      }
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start workflow run ────────────────────────────────────
app.post('/workflow/run', async (req, res) => {
  try {
    const { workflowId, inputs } = req.body;

    if (!GALAXY_KEY) {
      return res.status(500).json({ error: 'Galaxy AI API key not configured' });
    }

    const response = await fetch(`${GALAXY_API}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GALAXY_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ workflowId, inputs })
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get run details ───────────────────────────────────────
app.get('/run/:runId', async (req, res) => {
  try {
    const { runId } = req.params;

    if (!GALAXY_KEY) {
      return res.status(500).json({ error: 'Galaxy AI API key not configured' });
    }

    const response = await fetch(`${GALAXY_API}/runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${GALAXY_KEY}`
      }
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Ques Creator Studio Backend running on port ${PORT}`);
});
