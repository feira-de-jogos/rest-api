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

router.get('/extrato', async (req, res) => {
  try {
    if (req.session.token == null || req.session.token === '') {
      console.log('Usuário não autenticado. Redirecionando para login')
      res.redirect('/')
      return
    }
    const ticket = await client.verifyIdToken({
      audience,
      idToken: req.session.token
    })
    const payload = ticket.getPayload()

    // eslint-disable-next-line prefer-const
    let id = await db.query('SELECT * FROM jogadores WHERE email = $1', [payload.email])
    if (id.rowCount === 0) {
      res.redirect('/')
      return
    }

    const receitas = await db.query('SELECT SUM(valor) FROM receitas WHERE jogador_id = $1', [id.rows[0].id])
    const totalReceitas = parseInt(receitas.rows[0].sum)

    const despesas = await db.query('SELECT SUM(valor) FROM despesas WHERE jogador_id = $1', [id.rows[0].id])
    const totalDespesas = parseInt(despesas.rows[0].sum)

    const extratoMontado = await db.query('SELECT \'Receita\' AS tipo, jogos.nome AS transacao, receitas.valor AS valor, to_char(receitas.data, \'DD/MM/YYYY HH24:MI:SS\') AS data FROM receitas INNER JOIN jogos ON jogos.id = receitas.jogo_id WHERE receitas.jogador_id = (SELECT id FROM jogadores WHERE id = $1) UNION ALL SELECT \'Despesa\' AS tipo, produtos.descricao AS transacao, despesas.valor AS valor, to_char(despesas.data, \'DD/MM/YYYY HH24:MI:SS\') AS data FROM despesas INNER JOIN produtos ON produtos.id = despesas.produto_id WHERE despesas.jogador_id = (SELECT id FROM jogadores WHERE id = $1) ORDER BY data DESC;', [id.rows[0].id])
    let pagehtml = `
      <!DOCTYPE html>
      <html>
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Extrato</title>
      <link rel="icon" href="/img/Banco-Imagem.ico" type="image/ico">
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
          margin: 0 10px;
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
            flex-wrap: wrap;
          }
          .nav-links li {
            margin: 0 0px;
          }
          .nav-links a {
            font-size: 16px; /* Aumenta o tamanho da fonte para maior legibilidade */
            padding: 10px 15px;
          }
          .user-actions a {
            font-size: 16px;
            margin-left: 10px;
            order: -1;
            margin-top: 0;
          }
          .saldo {
            font-size: 16px;
            margin-left: auto;
          }
        }
        </style>
      </head>
      <body>
      <div class="nav-bar">
        <ul class="nav-links">
            <li><a href="/api/v1/extrato">Extrato</a></li>
            <li><a href="/api/v1/pix">Pix</a></li>
            <li><a href="/api/v1/conta">Conta</a></li>
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

    pagehtml += '</div></body></html>'
    res.send(pagehtml)
  } catch (err) {
    res.sendStatus(500)
  }
})

module.exports = router
