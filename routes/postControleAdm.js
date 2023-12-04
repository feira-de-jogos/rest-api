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

router.get('/adm', async (req, res) => {
  let payload
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
    payload = ticket.getPayload()
  } catch (err) {
    res.redirect('/')
  }

  try {
    const id = await db.query('SELECT * FROM jogadores WHERE email = $1', [payload.email])
    if (id.rowCount === 0) {
      res.redirect('/')
      return
    }
    const idNumero = id.rows[0].id
    const senha = id.rows[0].senha

    if (idNumero !== 2 && idNumero !== 1 && idNumero !== 17) {
      res.redirect('/api/v1/extrato')
      return
    }

    const receitas = await db.query('SELECT COALESCE(SUM(valor), 0) FROM receitas WHERE jogador_id = $1', [idNumero])
    const totalReceitas = parseInt(receitas.rows[0].coalesce)

    const despesas = await db.query('SELECT COALESCE(SUM(valor), 0) FROM despesas WHERE jogador_id = $1', [idNumero])
    const totalDespesas = parseInt(despesas.rows[0].coalesce)

    const relacaoProdutoEstoque = await db.query('SELECT produtos.*, estoque.quantidade, estoque.maquina_id FROM produtos JOIN estoque ON produtos.id = estoque.produto_id ORDER BY produtos.descricao;')

    let tableHtml = '<table border="1">'
    tableHtml += '<tr><th>ID</th><th>Descrição</th><th>Valor</th><th>Quantidade</th><th>Maquina ID</th></tr>'

    for (const produtoEstoque of relacaoProdutoEstoque.rows) {
      tableHtml += `<tr><td>${produtoEstoque.id}</td><td>${produtoEstoque.descricao}</td><td>${produtoEstoque.valor}</td><td>${produtoEstoque.quantidade}</td><td>${produtoEstoque.maquina_id}</td></tr>`
    }

    tableHtml += '</table>'
    const pagehtml = `
    <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Página Admin</title>
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
          /* Add or modify these CSS styles */
            .forms label {
            margin-bottom: 8px;
            font-weight: bold;
            font-size: 16px;
            }

            .forms select {
            width: 100%;
            padding: 10px;
            margin-bottom: 16px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 16px;
            }

            .option{
            display: flex;
            flex-direction: column;
            max-width: 400px;
            margin: 0 auto;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              max-width: 100%;
            }
          
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
          
            th {
              background-color: #f2f2f2;
            }
          
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
          
            /* Estilos adicionais para a tabela dentro da div DadosDiv */
            #DadosDiv table {
              margin-top: 0; /* Reduzir a margem superior para se adequar ao layout da página */
              max-width: 100%;
              overflow-x: auto;
            }
            .forms input {
              box-sizing: border-box;
              width: 100%;
              max-width: 400px; /* Defina uma largura máxima para o campo de entrada */
              padding: 10px;
              margin-bottom: 16px;
              border: 1px solid #ccc;
              border-radius: 4px;
              font-size: 16px;
            }
            .responsive-table {
              width: 100%;
              overflow-x: auto;
              display: block;
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
          table {
            width: 100%;
            overflow-x: auto;
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
    <h1>Funções de administrador</h1>
    
    

    <div class="forms">
    <label for="operation">Escolha o Modo:</label>
    <select name="operation" id="operation">
    <option value="alterarEstoque">Alterar estoque</option>
    <option value="alterarValor">Alterar valor</option>
    <option value="verDados">Ver Dados</option>
    </select>

    <div id="EstoqueDiv">
    <label for="productIdE">ID do produto:</label>
    <br>
    <input type="number" id="productIdE" name="productIdE" required inputmode="numeric" pattern="[0-9]*" maxlength="4">
    <br>
    <label for="amountE">Valor a atualizar o estoque:</label>
    <br>
    <input type="number" id="amountE" name="amountE" required required inputmode="numeric" pattern="[0-9]*">
    <br>
    <label for="passwordE">Confirme sua senha:</label>
    <br>
    <input type="password" id="passwordE" name="passwordE" required inputmode="numeric" pattern="[0-9]*" maxlength="4">
    <br>
    <button id="btn-atualizar-estoque">Atualizar Estoque</button>
    </div>

    <div id="ValorDiv">
    <label for="productIdV">ID do produto:</label>
    <br>
    <input type="number" id="productIdV" name="productIdV" required inputmode="numeric" pattern="[0-9]*" maxlength="4">
    <br>
    <label for="amountV">Quantidade de tijolos do produto:</label>
    <br>
    <input type="number" id="amountV" name="amountV" required required inputmode="numeric" pattern="[0-9]*">
    <br>
    <label for="passwordV">Confirme sua senha:</label>
    <br>
    <input type="password" id="passwordV" name="passwordV" required inputmode="numeric" pattern="[0-9]*" maxlength="4">
    <br>
    <button id="btn-atualizar-valor">Atualizar Valor</button>
    </div>
    <div id="DadosDiv" class="responsive-table">
      ${tableHtml}
    </div>


    </div>
  </div>

  
  
  <script>
  document.addEventListener('DOMContentLoaded', function () {
    const operationSelect = document.getElementById('operation');
    const EstoqueDiv = document.getElementById('EstoqueDiv');
    const ValorDiv = document.getElementById('ValorDiv');
    const DadosDiv = document.getElementById('DadosDiv');

    function updateDivVisibility() {
      // Oculta ou exibe a div com base na opção selecionada
      if (operationSelect.value === 'alterarEstoque') {
        EstoqueDiv.style.display = 'block';
        ValorDiv.style.display = 'none';
        DadosDiv.style.display = 'none';
      } else if(operationSelect.value === 'alterarValor') {
        EstoqueDiv.style.display = 'none';
        ValorDiv.style.display = 'block';
        DadosDiv.style.display = 'none';
      }else if(operationSelect.value === 'verDados') {
        EstoqueDiv.style.display = 'none';
        ValorDiv.style.display = 'none';
        DadosDiv.style.display = 'block';
      }
    }

    // Verifica se os elementos necessários existem no documento
    if (operationSelect && EstoqueDiv && ValorDiv) {
      // Adiciona o ouvinte de evento à seleção de operação
      operationSelect.addEventListener('change', updateDivVisibility);

      // Chama a função inicialmente para definir a visibilidade correta ao carregar a página
      updateDivVisibility();
    }

    const atualizarEstoqueButton = document.getElementById('btn-atualizar-estoque');
    const productIDEInput = document.getElementById('productIdE');
    const amountEInput = document.getElementById('amountE');
    const passwordEInput = document.getElementById('passwordE');
    
    atualizarEstoqueButton.addEventListener('click', async function () {
      const productIdE = productIDEInput.value;
      const amountE = amountEInput.value;
      const passwordE = passwordEInput.value;
      var numericRegex = /^[0-9]+$/;

      if (productIdE !== '' && amountE !== '' && passwordE !== '' && numericRegex.test(productIdE) && numericRegex.test(amountE) && numericRegex.test(passwordE) && passwordE == ${senha}) {
        try {
        const idNumero = ${idNumero};
        const response = await fetch('/api/v1/atualizar-estoque', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productIdE, amountE, idNumero}),
        });

        const resultado = await response.json();

        if (resultado.result == 1) {
          alert(resultado.message)
          productIDEInput.value = '';
        } else if(resultado.result == 2){
          alert(resultado.message)
          productIDEInput.value = '';
        } else if(resultado.result == 3){
          alert(resultado.message)
          productIDEInput.value = '';
        }else if(resultado.result == 4){
          alert(resultado.message)
          amountEInput.value = '';
        } else if(resultado.result == 5){
          alert(resultado.message)
          location.reload()
        }else{
          console.error('Erro ao atualizar a senha:', result.error);
        }

        } catch (error) {
          console.error('Erro ao atualizar a senha:', error);
        }
  
        // Limpa os campos de senha
        passwordEInput.value = '';
      } else if(productIdE == '' || amountE == '' || passwordE == ''){
        alert('Todos os dados devem ser preenchidos');
      } else if (!numericRegex.test(productIdE) || !numericRegex.test(amountE) || !numericRegex.test(passwordE)) {
        alert("Por favor, insira apenas números");
      } else if(passwordE != ${senha}){
        alert("Senha Incorreta");
      }
    });

    const atualizarValorButton = document.getElementById('btn-atualizar-valor');
    const productIDVInput = document.getElementById('productIdV');
    const amountVInput = document.getElementById('amountV');
    const passwordVInput = document.getElementById('passwordV');
    
    atualizarValorButton.addEventListener('click', async function () {
      const productIdV = productIDVInput.value;
      const amountV = amountVInput.value;
      const passwordV = passwordVInput.value;
      var numericRegex = /^[0-9]+$/;

      if (productIdV !== '' && amountV !== '' && passwordV !== '' && numericRegex.test(productIdV) && numericRegex.test(amountV) && numericRegex.test(passwordV) && passwordV == ${senha}) {
        try {
        const idNumero = ${idNumero};
        const response = await fetch('/api/v1/atualizar-valor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productIdV, amountV, idNumero}),
        });

        const resultado = await response.json();

        if (resultado.result == 1) {
          alert(resultado.message)
          productIDVInput.value = '';
        } else if(resultado.result == 2){
          alert(resultado.message)
          productIDVInput.value = '';
        } else if(resultado.result == 3){
          alert(resultado.message)
          productIDVInput.value = '';
        }else if(resultado.result == 4){
          alert(resultado.message)
          amountVInput.value = '';
        } else if(resultado.result == 5){
          alert(resultado.message)
          location.reload()
        }else{
          console.error('Erro ao atualizar a senha:', result.error);
        }

        } catch (error) {
          console.error('Erro ao atualizar a senha:', error);
        }
  
        // Limpa os campos de senha
        passwordInput.value = '';
      } else if(productIdV == '' || amountV == '' || passwordV == ''){
        alert('Todos os dados devem ser preenchidos');
      } else if (!numericRegex.test(productIdV) || !numericRegex.test(amountV) || !numericRegex.test(passwordV)) {
        alert("Por favor, insira apenas números");
      } else if(passwordV != ${senha}){
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

router.post('/atualizar-estoque', async (req, res) => {
  try {
    const { productIdE, amountE, idNumero } = req.body

    const produto = await db.query('SELECT * from produtos where id = $1', [productIdE])
    if (produto.rowCount === 0) {
      res.json({ result: 1, message: 'Produto não encontrado' })
      return
    }

    if (productIdE === 5) {
      res.json({ result: 2, message: 'Não é possivel alterar o estoque do pix' })
      return
    }

    if (idNumero !== 2 && idNumero !== 1 && idNumero !== 17) {
      res.json({ result: 3, message: 'Você não é um administrador!' })
      return
    }
    if (amountE < 0) {
      res.json({ result: 4, message: 'Você não pode deixar o valor do estoque negativo!' })
      return
    }
    await db.query('UPDATE estoque SET quantidade = $1 WHERE id = $2', [amountE, productIdE])

    res.json({ result: 5, message: 'Estoque Atualizado com sucesso' })
  } catch (error) {
    res.sendStatus(500)
  }
})

router.post('/atualizar-valor', async (req, res) => {
  try {
    const { productIdV, amountV, idNumero } = req.body

    const produto = await db.query('SELECT * from produtos where id = $1', [productIdV])
    if (produto.rowCount === 0) {
      res.json({ result: 1, message: 'Produto não encontrado' })
      return
    }

    if (productIdV === 5) {
      res.json({ result: 2, message: 'Não é possivel alterar o valor do pix' })
      return
    }

    if (idNumero !== 2 && idNumero !== 1 && idNumero !== 17) {
      res.json({ result: 3, message: 'Você não é um administrador!' })
      return
    }
    if (amountV < 0) {
      res.json({ result: 4, message: 'Você não pode deixar o valor do produto negativo!' })
      return
    }
    await db.query('UPDATE produtos SET valor = $1 WHERE id = $2', [amountV, productIdV])

    res.json({ result: 5, message: 'Valor Atualizado com sucesso' })
  } catch (error) {
    res.sendStatus(500)
  }
})

module.exports = router
