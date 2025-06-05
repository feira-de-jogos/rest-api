const express = require("express");
const router = express.Router();
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client();
const audience = process.env.GOOGLE_CLIENT_ID.split(" ");
const db = require("../db.js");

router.get("/products", async (req, res) => {
  let payload;
  let email;

  try {
    const ticket = await client.verifyIdToken({
      audience,
      idToken: req.token,
    });
    payload = ticket.getPayload();
    email = payload.email;
  } catch (err) {
    console.error(err);
    return res.sendStatus(401);
  }

  try {
    const auth = await db.query(
      'SELECT "id" FROM "people" WHERE "email" = $1',
      [email],
    );
    if (auth.rowCount === 0) {
      return res.sendStatus(401);
    }

    let productSearch = await db.query(
      'SELECT "products"."id" AS "id", "products"."name" AS "name", "products"."description" AS "description", "products"."image" AS "image", "products"."price" AS "price", "stock"."quantity" AS "stock", "types"."name" AS "type" FROM "products" INNER JOIN "stock" ON "products"."id" = "stock"."product" INNER JOIN "types" ON "products"."type" = "types"."id" WHERE "types"."name" = \'foods\' OR "types"."name" = \'arcade\' ORDER BY "products"."price" ASC;',
    );
    const products = productSearch.rows.map((product) => ({
      product: product.id,
      name: product.name,
      description: product.description,
      image: product.image,
      price: product.price,
      stock: product.stock,
      type: product.type,
    }));

    return res.status(200).json(products);
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
});

module.exports = router;
