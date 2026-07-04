import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 4201;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({ windowMs: 60000, max: 100 });
app.use('/api/', limiter);

// Serve static editor files
app.use(express.static(path.join(__dirname, '../dist')));

// ─── Unsplash API ─────────────────────────────────────
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';

app.get('/api/unsplash/search', async (req, res) => {
  try {
    const query = req.query.query || 'abstract';
    const perPage = parseInt(req.query.per_page || '20');
    if (UNSPLASH_ACCESS_KEY) {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=squarish`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
      );
      const data = await response.json();
      return res.json(data.results || []);
    }
    // Fallback: return placeholder images
    const results = [];
    for (let i = 0; i < perPage; i++) {
      results.push({
        id: `placeholder_${i}`,
        urls: { small: `https://picsum.photos/seed/${query}_${i}/400/400`, regular: `https://picsum.photos/seed/${query}_${i}/800/800` },
        alt_description: `${query} image ${i}`,
        user: { name: 'Picsum', links: { html: 'https://picsum.photos' } },
      });
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Google Fonts API ──────────────────────────────────
app.get('/api/fonts', async (req, res) => {
  try {
    const API_KEY = process.env.GOOGLE_FONTS_API_KEY;
    if (API_KEY) {
      const response = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&sort=popularity`);
      const data = await response.json();
      return res.json(data.items || []);
    }
    // Fallback: return common fonts
    res.json([
      { family: 'Inter', category: 'sans-serif' },
      { family: 'Plus Jakarta Sans', category: 'sans-serif' },
      { family: 'Arial', category: 'sans-serif' },
      { family: 'Georgia', category: 'serif' },
      { family: 'Courier New', category: 'monospace' },
      { family: 'Roboto', category: 'sans-serif' },
      { family: 'Open Sans', category: 'sans-serif' },
      { family: 'Lato', category: 'sans-serif' },
      { family: 'Montserrat', category: 'sans-serif' },
      { family: 'Poppins', category: 'sans-serif' },
      { family: 'Playfair Display', category: 'serif' },
      { family: 'Merriweather', category: 'serif' },
      { family: 'Fira Code', category: 'monospace' },
      { family: 'JetBrains Mono', category: 'monospace' },
      { family: 'Comic Neue', category: 'handwriting' },
    ]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AI Image Generation (Groq API) ────────────────────
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

app.post('/api/ai/generate', async (req, res) => {
  try {
    const { prompt, style } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    // Groq doesn't have image generation, but we can use it for prompt enhancement
    // For images, we'll use a placeholder approach or integrate with an image API
    if (GROQ_API_KEY) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a design assistant. Suggest a detailed image prompt for: ' + prompt },
            { role: 'user', content: `Generate a design for: ${prompt}${style ? ' in ' + style + ' style' : ''}` },
          ],
          max_tokens: 100,
        }),
      });
      const data = await response.json();
      return res.json({ description: data.choices?.[0]?.message?.content || prompt });
    }

    res.json({ description: `Design concept for: ${prompt}`, placeholder: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Templates API (local storage) ─────────────────────
import fs from 'fs';

const TEMPLATES_DIR = process.env.TEMPLATES_DIR || path.join(__dirname, '../templates');
if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR, { recursive: true });

app.get('/api/templates', (req, res) => {
  try {
    const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.json'));
    const templates = files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, f), 'utf-8'));
      return { id: f.replace('.json', ''), name: data.name || f.replace('.json', ''), thumbnail: data.thumbnail || null, objects: data.objects || [] };
    });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/templates', (req, res) => {
  try {
    const { name, objects, thumbnail } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '_' + Date.now();
    fs.writeFileSync(path.join(TEMPLATES_DIR, `${id}.json`), JSON.stringify({ name, objects, thumbnail, createdAt: new Date().toISOString() }));
    res.json({ id, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/templates/:id', (req, res) => {
  try {
    const file = path.join(TEMPLATES_DIR, `${req.params.id}.json`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Health check ─────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', name: 'SwiftsAI Editor API' });
});

// SPA fallback: serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`SwiftsAI Editor Server running on port ${PORT}`);
  console.log(`- Editor: http://localhost:${PORT}`);
  console.log(`- Health: http://localhost:${PORT}/api/health`);
  console.log(`- Unsplash: ${process.env.UNSPLASH_ACCESS_KEY ? 'configured' : 'fallback mode'}`);
  console.log(`- Groq AI: ${GROQ_API_KEY ? 'configured' : 'fallback mode'}`);
});
