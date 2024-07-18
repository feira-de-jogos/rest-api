const express = require('express')
const router = express.Router()
const { OAuth2Client } = require('google-auth-library')
const client = new OAuth2Client()
const audience = process.env.GOOGLE_CLIENT_ID
const { Pool } = require('pg')
const pool = new Pool()

router.get('/products', async (req, res) => {
  let payload
  try {
    const ticket = await client.verifyIdToken({
      audience,
      idToken: req.token
    })
    payload = ticket.getPayload()

    var email = payload.email
  } catch (err) {
    console.error(err)
    return res.sendStatus(401)
  }

  try {
    const auth = await pool.query('SELECT "id" FROM "people" WHERE "email" = $1', [email])
    if (auth.rowCount === 0) {
      return res.sendStatus(401)
    }

    let productSearch = await pool.query('SELECT * FROM "products" WHERE "type" = 2')
    const products = productSearch.rows.map(product => ({
      product: product.id,
      name: product.name,
      description: product.description,
      image: product.image,
      price: product.price,
      stock: product.stock
    }));

    return res.status(200).json(products);
  } catch (err) {
    console.error(err)
    return res.sendStatus(500)
  }
})

module.exports = router
