const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client();
const audience = "331191695151-ku8mdhd76pc2k36itas8lm722krn0u64.apps.googleusercontent.com";
const { Pool } = require('pg');
const pool = new Pool();

router.post('/login', async (req, res) => {
  let payload;
  try {
    const ticket = await client.verifyIdToken({
      audience,
      idToken: req.body.credential,
    });
    payload = ticket.getPayload();

    let email = payload.email;
    let name = payload.name;

    // Check if user exists in the database
    const auth = await pool.query('SELECT * FROM people WHERE email = $1', [email]);
    if (auth.rowCount === 0) {
      // Insert new user into the database
      let insertResult = await pool.query('INSERT INTO people (name, email) VALUES ($1, $2) RETURNING id', [name, email]);
      let userId = insertResult.rows[0].id
      return res.status(201).json({ user: userId })
    }
    let userId = auth.rows[0].id
    return res.status(200).json({ user: userId })
  } catch (err) {
    console.error(err);
    res.sendStatus(401);
  }
});

module.exports = router;
