const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');

const app = express();

// 🔑 Consumer secret
const consumerSecretApp = process.env.CANVAS_CONSUMER_SECRET || '5AE4CA1543118B24EDA3A67A68BFB4AB7564E6229C33AABD09416D36BC9CA3CB';
console.log('consumer secret - ' + consumerSecretApp);

// Static + EJS setup
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 🟢 GET route (for testing in browser)
app.get('/', (req, res) => {
  res.render('index', { req: '{}' });
});

// 🟣 POST route (Salesforce Canvas calls here)
app.post('/', (req, res) => {
  try {
    if (!req.body.signed_request) {
      return res.status(400).send('Missing signed_request');
    }

    const bodyArray = req.body.signed_request.split('.');
    const consumerSecret = bodyArray[0];
    const encoded_envelope = bodyArray[1];

    const check = crypto.createHmac('sha256', consumerSecretApp)
      .update(encoded_envelope)
      .digest('base64');

    if (check === consumerSecret) {
      const envelope = JSON.parse(Buffer.from(encoded_envelope, 'base64').toString('utf8'));
      console.log('✅ Canvas signed request verified!');
      console.log(envelope);
      res.render('index', {
        title: envelope.context.user.userName,
        req: JSON.stringify(envelope)
      });
    } else {
      res.status(401).send('❌ Authentication failed');
    }
  } catch (err) {
    console.error('Error parsing signed_request:', err);
    res.status(500).send('Server error');
  }
});

// 🟢 Listen on Heroku dynamic port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
