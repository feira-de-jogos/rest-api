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

router.get('/pix', async (req, res) => {
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
    const idNumero = id.rows[0].id
    const senha = id.rows[0].senha
    // const idNumero = id.rows[0].id
    // const senha = id.rows[0].senha
    const receitas = await db.query('SELECT COALESCE(SUM(valor), 0) FROM receitas WHERE jogador_id = $1', [id.rows[0].id])
    const totalReceitas = parseInt(receitas.rows[0].sum)

    const despesas = await db.query('SELECT COALESCE(SUM(valor), 0) FROM despesas WHERE jogador_id = $1', [id.rows[0].id])
    const totalDespesas = parseInt(despesas.rows[0].sum)

    // eslint-disable-next-line prefer-const
    let pagehtml = `
    <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Minha Conta</title>
  <link rel="icon" href="/img/Banco-Imagem.ico" type="image/ico">
  <style>
    /* Reset de estilos */
body, h1, h2, h3, p {
  margin: 0;
  padding: 0;
}

body {
  font-family: Arial, sans-serif;
  background-color: #f5f5f5;
  color: #333;
}

/* Barra de navegação */
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
          padding: 0px;
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
        .container {
            background-color: #fff;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            max-width: 800px;
            width: 100%;
            margin: 20px auto;
            padding: 20px;
          }
          h1 {
            text-align: center;
            color: #333;
            margin-bottom: 20px;
          }
          .container .forms {
            margin-top: 20px;
          }
          
          .forms {
            display: flex;
            flex-direction: column;
            max-width: 400px;
            margin: 0 auto;
          }
          
          label {
            margin-bottom: 8px;
            font-weight: bold;
            font-size: 16px;
          }
          
          input {
            padding: 10px;
            margin-bottom: 16px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 16px;
          }
          
          button {
            background-color: #3483fa;
            color: #fff;
            padding: 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
          }
          
          button:hover {
            background-color: #2652c0;
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
          .container {
            padding: 10px;
            margin: 10px auto;
            max-width: 100%; /* Ocupa 100% da largura da tela */
            box-sizing: border-box;
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
    <h1>Pix</h1>
    <div class="forms">
    <label for="userId">ID do usuário a receber:</label>
    <input type="number" id="userId" name="userId" required inputmode="numeric" pattern="[0-9]*" maxlength="4">

    <label for="amount">Quantidade de tijolos:</label>
    <input type="number" id="amount" name="amount" required required inputmode="numeric" pattern="[0-9]*">

    <label for="password">Confirme sua senha:</label>
    <input type="password" id="password" name="password" required inputmode="numeric" pattern="[0-9]*" maxlength="4">

    <button id="btn-enviar-pix">Enviar Pix</button>
    </div>
  </div>
  
  <script>
  document.addEventListener('DOMContentLoaded', function () {
    const enviarPixButton = document.getElementById('btn-enviar-pix');
    const userIDInput = document.getElementById('userId');
    const amountInput = document.getElementById('amount');
    const passwordInput = document.getElementById('password');
    
    enviarPixButton.addEventListener('click', async function () {
      const userID = userIDInput.value;
      const amount = amountInput.value;
      const password = passwordInput.value;
      var numericRegex = /^[0-9]+$/;
  
      
  
      // Verifica se os campos de senha não estão vazios e se a senha nova e a confirmação coincidem
      if (userID !== '' && amount !== '' && password !== '' && numericRegex.test(userID) && numericRegex.test(amount) && numericRegex.test(password) && password == ${senha}) {
        try {
        const idNumero = ${idNumero};
        const response = await fetch('/api/v1/enviar-pix', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userID, amount, idNumero}),
        });

        const resultado = await response.json();

        if (resultado.result == 1) {
          alert(resultado.message)
          //location.reload();
        } else if(resultado.result == 2){
          alert(resultado.message)
        } else if(resultado.result == 3){
          alert(resultado.message)
        }else if(resultado.result == 4){
          alert(resultado.message)
          location.reload()
        } else{
          console.error('Erro ao atualizar a senha:', result.error);
        }

        } catch (error) {
          console.error('Erro ao atualizar a senha:', error);
        }
  
        // Limpa os campos de senha
        userIDInput.value = '';
        amountInput.value = '';
        passwordInput.value = '';
      } else if(userID == '' || amount == '' || password == ''){
        alert('Todos os dados devem ser preenchidos');
      } else if (!numericRegex.test(userID) || !numericRegex.test(amount) || !numericRegex.test(password)) {
        alert("Por favor, insira apenas números");
      } else if(password != ${senha}){
        alert("Senha Incorreta");
      }
    });

  });
  </script>

</body>
</html>

    `
    res.send(pagehtml)
  } catch (err) {
    res.sendStatus(500)
  }
})

router.post('/enviar-pix', async (req, res) => {
  try {
    const { userID, amount, idNumero } = req.body

    // eslint-disable-next-line prefer-const
    let usuario = await db.query('SELECT * from jogadores where id = $1', [userID])
    if (usuario.rowCount === 0) {
      res.json({ result: 1, message: 'Usuário não encontrado' })
      return
    }
    const receitas = await db.query('SELECT COALESCE(SUM(valor), 0) FROM receitas WHERE jogador_id = $1', [idNumero])
    const totalReceitas = parseInt(receitas.rows[0].sum)

    const despesas = await db.query('SELECT COALESCE(SUM(valor), 0) FROM despesas WHERE jogador_id = $1', [idNumero])
    const totalDespesas = parseInt(despesas.rows[0].sum)

    if ((totalReceitas - totalDespesas) < amount) {
      res.json({ result: 2, message: 'Saldo Insuficiente' })
      return
    }

    // eslint-disable-next-line eqeqeq
    if (userID == idNumero) {
      res.json({ result: 3, message: 'Não é possivel enviar um pix para você mesmo!' })
      return
    }
    await db.query('INSERT INTO receitas (jogador_id, jogo_id, valor, data) VALUES ($1, 13, $2, NOW())', [userID, amount])
    await db.query('INSERT INTO despesas (jogador_id, produto_id, valor, data) VALUES ($1, 5, $2, NOW())', [idNumero, amount])

    console.log('Pix Enviado')
    res.json({ result: 4, message: 'Pix enviado com sucesso!' })
  } catch (error) {
    console.error('Erro ao atualizar a senha:', error)
    res.status(500).send('Erro ao atualizar a senha')
  }
})

module.exports = router
