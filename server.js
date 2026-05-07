const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') { return res.sendStatus(200); }
  next();
});

app.post('/api/generate', async function(req, res) {
  var prompt = req.body.prompt;
  if (!prompt) { return res.status(400).json({ error: 'Prompt manquant' }); }
  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { return res.status(500).json({ error: 'ANTHROPIC_API_KEY manquante' }); }
  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    var data = await response.json();
    if (data.error) { return res.status(500).json({ error: data.error.message }); }
    return res.json({ text: data.content[0].text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/create-payment-intent', async function(req, res) {
  var stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) { return res.status(500).json({ error: 'STRIPE_SECRET_KEY manquante' }); }
  var stripe = require('stripe')(stripeKey);
  try {
    var intent = await stripe.paymentIntents.create({ amount: req.body.amount || 299, currency: 'eur' });
    return res.json({ client_secret: intent.client_secret });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() { console.log('CareSpark running on port ' + PORT); });
