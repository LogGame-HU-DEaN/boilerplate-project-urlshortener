require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('dns');

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true, unique: true }
});

const Url = mongoose.model('Url', urlSchema);

app.post('/api/shorturl', express.urlencoded({ extended: true }), async function(req, res) {
    const inputUrl = req.body.url;

  let hostname;
  try {
    const parsedUrl = new URL(inputUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Invalid protocol');
    }
    hostname = parsedUrl.hostname;
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }

  dns.lookup(hostname, async (err, address) => {
    if (err) {
      console.error("DNS error:", err);
      return res.json({ error: 'invalid url' });
    }

    const shortUrl = Math.floor(Math.random() * 1000000);

    const newUrl = new Url({ original_url: inputUrl, short_url: shortUrl });

    try {
      const savedDoc = await newUrl.save();
      res.json({ original_url: savedDoc.original_url, short_url: savedDoc.short_url });
    } catch (saveErr) {
      console.error("Error saving URL:", saveErr);
      res.status(500).json({ error: 'Error saving URL' });
    }
  });
});

app.get('/api/shorturl/:short_url', async function(req, res) {
  const shortUrl = req.params.short_url;
  try {
    const urlDoc = await Url.findOne({ short_url: shortUrl });
    if (!urlDoc) {
      return res.status(404).json({ error: 'URL not found' });
    }
    res.redirect(urlDoc.original_url);
  } catch (err) {
    console.error("Error retrieving URL:", err);
    res.status(500).json({ error: 'Error retrieving URL' });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
