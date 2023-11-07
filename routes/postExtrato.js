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

    let receitas = await db.query('SELECT jogos.nome AS jogo, to_char(receitas.data, \'DD/MM/YYYY HH24:MI:SS\') AS data, receitas.valor FROM receitas INNER JOIN jogos ON jogos.id = receitas.jogo_id WHERE receitas.jogador_id = $1', [id.rows[0].id])
    receitas = { receitas: receitas.rows }

    let despesas = await db.query('SELECT produtos.descricao AS produto, to_char(despesas.data, \'DD/MM/YYYY HH24:MI:SS\') AS data, despesas.valor FROM despesas INNER JOIN produtos ON produtos.id = despesas.produto_id WHERE despesas.jogador_id = $1', [id.rows[0].id])
    despesas = { despesas: despesas.rows }

    let pagehtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
        * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: Arial, sans-serif;
        background-color: #f5f5f5;
      }
      .container {
        align-items: center;
        background-color: #ffffff;
        margin: 20px;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
        max-width: 800px;
        width: 100%;
        margin-top: 50px;
        margin-left: auto;
        margin-right: auto;
      }
      .receita-container, .despesa-container {
        background-color: #ffffff;
        margin-bottom: 20px;
        padding: 20px;
        border-radius: 10px;
        border: 1px solid #eaeaea;
      }
      .receita-container p, .despesa-container p {
        margin: 5px 0;
        color: #333;
      }
      h1 {
        text-align: center;
        padding-bottom: 20px;
        color: #333;
      }
      .receita-container {
        border-left: 5px solid #00a400;
      }
      .despesa-container {
        border-left: 5px solid #e84855;
      }
      .nav-bar {
        background-color: #fff;
        border-bottom: 1px solid #ddd;
        padding: 10px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap; /* Permite que os elementos quebrem a linha quando não houver espaço suficiente */
      }
      .nav-links {
        list-style: none;
        margin: 10px 0; /* Adiciona um espaço entre os links e os elementos vizinhos */
        display: flex;
        flex-wrap: wrap; /* Permite que os elementos quebrem a linha quando não houver espaço suficiente */
      }
      .nav-links li {
        margin: 0 20px;
      }
      .nav-links a {
        text-decoration: none;
        color: #333;
        font-size: 18px;
        font-weight: bold;
      }
      .nav-links a:hover {
        color: #3483fa;
      }
      .user-actions {
        display: flex;
        align-items: center;
        margin-top: 10px; /* Adiciona um espaço entre a barra de navegação e as ações do usuário */
      }
      .user-actions a {
        text-decoration: none;
        color: #333;
        font-size: 18px;
        font-weight: bold;
        margin-left: 20px;
      }
      .user-actions a:hover {
        color: #3483fa;
      }
      
      .saldo {
      text-decoration: none;
      color: #333;
      font-size: 18px;
      font-weight: bold;
      }
        </style>
      </head>
      <body>
      <div class="nav-bar">
        <ul class="nav-links">
            <li><a href="/receitas">Receitas</a></li>
            <li><a href="/despesas">Despesas</a></li>
            <li><a href="/extrato">Extrato</a></li>
            <li><a href="/produtos">Produtos</a></li>
        </ul>
        <div class="user-actions">
           <p class="saldo">Saldo: TJ$ ${receitas - despesas}</p>
        </div>
    </div>
        <div class="container">
          <h1>Extrato</h1>
    `

    receitas.rows.forEach(row => {
      const tipoLower = row.tipo.toLowerCase()
      const tipoExibicao = tipoLower === 'receita' ? 'Valor ganho' : 'Valor gasto'
      const dataFormatada = row.data

      pagehtml += `
    <div class="${tipoLower}-container">
      <p><strong>Tipo:</strong> ${row.tipo}</p>
      <p><strong>Transação:</strong> ${row.transacao}</p>
      <p><strong>${tipoExibicao}:</strong> ${row.valor} Tijolinhos</p>
      <p><strong>Data:</strong> ${dataFormatada} </p>
    </div>
  `
    })
    res.send({
      pagehtml
    })
  } catch (err) {
    res.sendStatus(500)
  }
})

module.exports = router
