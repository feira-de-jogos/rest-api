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

router.get('/conta', async (req, res) => {
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
    const receitas = await db.query('SELECT SUM(valor) FROM receitas WHERE jogador_id = $1', [id.rows[0].id])
    const totalReceitas = parseInt(receitas.rows[0].sum)

    const despesas = await db.query('SELECT SUM(valor) FROM despesas WHERE jogador_id = $1', [id.rows[0].id])
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

/* Container principal */
.container {
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  width: 100%;
  margin: 20px auto;
  padding: 20px;
}

/* Título */
h1 {
  text-align: center;
  color: #333;
  margin-bottom: 20px;
}

/* Contêiner de informações */
.tipoLower-container {
  display: flex;
  flex-wrap: wrap;
}

.info-container {
  flex: 1;
  background-color: #ffffff;
  margin: 0 10px 20px 0;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.info-container p {
  margin: 5px 0;
  font-size: 16px;
}

.botaoSair {
  display: block;
  margin: 20px auto 0;
  padding: 10px;
  background-color: #ff4d4d; /* Vermelho */
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s; /* Adiciona uma transição suave para a mudança de cor */
}

.botaoSair:hover {
  background-color: #cc0000; /* Vermelho mais escuro ao passar o mouse */
}

/* Botão para mostrar senha */
#mostrar-senha,
#btn-mudar-senha {
  background-color: #4caf50;
  color: white;
  padding: 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 10px;
}

#mostrar-senha:hover,
#btn-mudar-senha:hover {
  background-color: #45a049;
}

/* Campos de senha */
#nova-senha,
#confirmar-senha {
  width: calc(100% - 20px);
  padding: 10px;
  margin-top: 5px;
  margin-bottom: 10px;
  box-sizing: border-box;
}
/* Responsividade */
@media (max-width: 768px) {
  .container {
    padding: 10px;
    margin: 0 auto;
    max-width: 100%; /* Ocupa 100% da largura da tela */
    box-sizing: border-box;
  }

  .tipoLower-container {
    flex-direction: column;
    align-items: center;
  }

  .info-container {
    width: calc(100% - 20px); /* Reduz a largura para acomodar margens e evitar estouro */
    margin: 0 0 10px 0; /* Reduz a margem inferior */
    box-sizing: border-box;
  }

  #senha,
  #mudar-senha {
    width: calc(100% - 20px); /* Reduz a largura para acomodar margens e evitar estouro */
  }

  #mostrar-senha,
  #btn-mudar-senha {
    font-size: 14px;
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
    <h1>Minha Conta</h1>
    <div class="tipoLower-container">
      <div id="nome-container" class="info-container">
        <p><strong>Nome:</strong> ${payload.name}</p>
      </div>
      <div id="id-container" class="info-container">
        <p><strong>ID:</strong> ${idNumero}</p>
      </div>
      <div id="senha" class="info-container">
      <p><strong>Senha:</strong> <span id="senha-oculta">****</span></p>
        <button id="mostrar-senha">Mostrar Senha</button>
      </div>
      <div id="mudar-senha" class="info-container">
        <input type="password" id="nova-senha" placeholder="Nova Senha" required inputmode="numeric" pattern="[0-9]*" maxlength="4">
        <input type="password" id="confirmar-senha" placeholder="Confirmar Senha" required inputmode="numeric" pattern="[0-9]*" maxlength="4">
        <button id="btn-mudar-senha">Mudar Senha</button>
      </div>
    </div>
    <button id="btn-sair-conta" class="botaoSair">Sair da Conta</button>
  </div>
  <script>
  document.addEventListener('DOMContentLoaded', function () {
    const mostrarSenhaButton = document.getElementById('mostrar-senha');
    const senhaOculta = document.getElementById('senha-oculta');
  
    mostrarSenhaButton.addEventListener('click', function () {
      if (senhaOculta.textContent === '****') {
        senhaOculta.textContent = '${senha}';
        mostrarSenhaButton.textContent = 'Ocultar Senha';
      } else {
        senhaOculta.textContent = '****';
        mostrarSenhaButton.textContent = 'Mostrar Senha';
      }
    });

    const mudarSenhaButton = document.getElementById('btn-mudar-senha');
    const novaSenhaInput = document.getElementById('nova-senha');
    const confirmarSenhaInput = document.getElementById('confirmar-senha');
    
    mudarSenhaButton.addEventListener('click', async function () {
      const novaSenha = novaSenhaInput.value;
      const confirmarSenha = confirmarSenhaInput.value;
  
      // Verifica se os campos de senha não estão vazios e se a senha nova e a confirmação coincidem
      if (novaSenha !== '' && novaSenha === confirmarSenha) {
        try {
          const idNumero = ${idNumero}; // Substitua com a maneira correta de obter o ID
        const response = await fetch('/api/v1/mudar-senha', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ idNumero, novaSenha }),
        });

        const result = await response.json();

        if (result.success) {
          console.log('Senha atualizada com sucesso!');
          // Recarrega a página
          location.reload();
        } else {
          console.error('Erro ao atualizar a senha:', result.error);
        }
        } catch (error) {
          console.error('Erro ao atualizar a senha:', error);
        }
  
        // Limpa os campos de senha
        novaSenhaInput.value = '';
        confirmarSenhaInput.value = '';
      } else {
        alert('Os campos de senha devem ser preenchidos e as senhas devem coincidir.');
      }
    });

    const botaoSair = document.getElementById('btn-sair-conta');

    botaoSair.addEventListener('click', function () {
      // Limpa o token da sessão
      fetch('/api/v1/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then(response => response.json())
        .then(result => {
          if (result.success) {
            // Redireciona para a página desejada após o logout
            window.location.href = 'https://feira-de-jogos.sj.ifsc.edu.br';
          } else {
            console.error('Erro ao fazer logout:', result.error);
          }
        })
        .catch(error => {
          console.error('Erro ao fazer logout:', error);
        });
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

router.post('/mudar-senha', async (req, res) => {
  try {
    const { idNumero, novaSenha } = req.body

    await db.query('UPDATE jogadores SET senha = $1 WHERE id = $2', [novaSenha, idNumero])

    console.log('Senha atualizada com sucesso!')
    res.json({ success: true, message: 'Senha atualizada com sucesso!' })
  } catch (error) {
    console.error('Erro ao atualizar a senha:', error)
    res.status(500).send('Erro ao atualizar a senha')
  }
})

router.post('/logout', (req, res) => {
  // Limpar a sessão
  req.session.token = null

  // Enviar uma resposta JSON indicando sucesso
  res.json({ success: true })
})

module.exports = router
