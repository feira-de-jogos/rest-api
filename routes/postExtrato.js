const express = require('express')
const session = require('express-session')
const router = express.Router()
const { OAuth2Client } = require('google-auth-library')
const client = new OAuth2Client()
const db = require('../db.js')
const audience = process.env.GOOGLE_CLIENT_ID

router.use(session({
  secret: 'O1iP4BTe4ApgxLhAbeZPGnbjZOzH2fmg', // Troque isso por uma chave secreta forte
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Configurações do cookie (pode precisar ser ajustado para produção)
}))

router.post('/extrato', async (req, res) => {
  try {
    let idTokenn
    if (req.session.token != null) {
      idTokenn = req.session.token
    } else {
      idTokenn = req.body.credential
    }

    const ticket = await client.verifyIdToken({
      audience,
      idToken: idTokenn
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
    const receitas = await db.query('SELECT SUM(valor) FROM receitas WHERE jogador_id = $1', [id.rows[0].id])
    const totalReceitas = parseInt(receitas.rows[0].sum)

    const despesas = await db.query('SELECT SUM(valor) FROM despesas WHERE jogador_id = $1', [id.rows[0].id])
    const totalDespesas = parseInt(despesas.rows[0].sum)

    const extratoMontado = await db.query('SELECT \'Receita\' AS tipo, jogos.nome AS transacao, receitas.valor AS valor, to_char(receitas.data, \'DD/MM/YYYY HH24:MI:SS\') AS data FROM receitas INNER JOIN jogos ON jogos.id = receitas.jogo_id WHERE receitas.jogador_id = (SELECT id FROM jogadores WHERE id = $1) UNION ALL SELECT \'Despesa\' AS tipo, produtos.descricao AS transacao, despesas.valor AS valor, to_char(despesas.data, \'DD/MM/YYYY HH24:MI:SS\') AS data FROM despesas INNER JOIN produtos ON produtos.id = despesas.produto_id WHERE despesas.jogador_id = (SELECT id FROM jogadores WHERE id = $1) ORDER BY data DESC;', [id.rows[0].id])
    req.session.token = req.body.credential
    let pagehtml = `
      <!DOCTYPE html>
      <html>
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Extrato</title>
      <link rel="shortcut icon" href="../frontend/img/Banco-Imagem.png" type="image/png">
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
          flex-wrap: wrap;
        }
        .nav-links {
          list-style: none;
          margin: 10px 0;
          display: flex;
          flex-wrap: wrap;
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
          margin-top: 10px;
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
          margin-bottom: 10px;
        }
        @media (max-width: 768px) {
          .nav-bar {
            padding: 10px; /* Aumenta o preenchimento para criar mais espaço em branco */
          }
          .nav-links li {
            margin: 0 10px;
          }
          .nav-links a {
            font-size: 16px; /* Aumenta o tamanho da fonte para maior legibilidade */
          }
          .user-actions a {
            font-size: 16px;
            margin-left: 10px;
          }
          .saldo {
            font-size: 16px;
          }
        }
        @media (max-width: 768px) {
          .nav-links a {
            font-size: 16px;
            padding: 10px 15px; /* Adicione preenchimento para criar uma área de toque maior */
          }
        }
        </style>
      </head>
      <body>
      <div class="nav-bar">
        <ul class="nav-links">
            <li><a href="/api/v1/extrato">Extrato</a></li>
        </ul>
        <div class="user-actions">
           <p class="saldo">Saldo: TJ$ ${totalReceitas - totalDespesas}</p>
        </div>
      </div>
      <div class="container">
        <h1>Extrato</h1>
    `

    extratoMontado.rows.forEach(row => {
      const tipoLower = row.tipo.toLowerCase()
      const tipoExibicao = tipoLower === 'receita' ? 'Valor ganho' : 'Valor gasto'
      const tipoExibicao2 = tipoLower === 'receita' ? 'Jogo' : 'Produto comprado'
      const dataFormatada = row.data

      pagehtml += `
        <div class="${tipoLower}-container">
          <p><strong>Tipo:</strong> ${row.tipo}</p>
          <p><strong>${tipoExibicao2}:</strong> ${row.transacao}</p>
          <p><strong>${tipoExibicao}:</strong> ${row.valor} Tijolinhos</p>
          <p><strong>Data:</strong> ${dataFormatada} </p>
        </div>
      `
    })

    pagehtml += `</div><script>console.log("${req.session.token}")</script></body></html>`
    res.send(pagehtml)
  } catch (err) {
    res.sendStatus(500)
  }
})

module.exports = router
