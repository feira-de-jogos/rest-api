const express = require('express')
const router = express.Router()
const { OAuth2Client } = require('google-auth-library')
const client = new OAuth2Client()
const db = require('../db.js')
const audience = process.env.GOOGLE_CLIENT_ID

router.post('/extrato', async (req, res) => {
  try {
    const ticket = await client.verifyIdToken({
      audience,
      idToken: req.body.credential
    })
    const payload = ticket.getPayload()

    let senha
    let id = await db.query('SELECT * FROM jogadores WHERE email = $1', [payload.email])
    if (id.rowCount === 0) {
      senha = Math.round(Math.random() * 8999 + 1000) // [0, 1] -> [1000, 9999]
      id = await db.query('INSERT INTO jogadores (apelido, senha, email) VALUES ($1, $2, $3) RETURNING id', [payload.name, senha, payload.email])
    }
    // id = id.rows[0].id

    // let receitas = await db.query('SELECT jogos.nome AS jogo, to_char(receitas.data, \'DD/MM/YYYY HH24:MI:SS\') AS data, receitas.valor FROM receitas INNER JOIN jogos ON jogos.id = receitas.jogo_id WHERE receitas.jogador_id = $1', [id.rows[0].id])
    // receitas = { receitas: receitas.rows }

    // let despesas = await db.query('SELECT produtos.descricao AS produto, to_char(despesas.data, \'DD/MM/YYYY HH24:MI:SS\') AS data, despesas.valor FROM despesas INNER JOIN produtos ON produtos.id = despesas.produto_id WHERE despesas.jogador_id = $1', [id.rows[0].id])
    // despesas = { despesas: despesas.rows }

    const pagehtml = `
    <!DOCTYPE html>
    <html lang="en">
    
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>HTML</title>
      <link rel="shortcut icon" href="./img/Banco-Imagem.png" type="image/png">
    </head>
    
    <body>
    <h1> Funcionou HTML</h1>
    </body>
    
    </html>
    `
    res.send(
      pagehtml
    )
  } catch (err) {
    res.sendStatus(500)
  }
})

module.exports = router
