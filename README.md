# 🎯 Roleta de Prêmios - Home Ótica

Aplicativo web completo, moderno e interativo desenvolvido sob medida para a **Home Ótica**. Feito para ser utilizado na loja física (computador, notebook, iPad, tablet ou monitor touch no balcão).

---

## ✨ Principais Funcionalidades

1. **Zero Banco de Dados (100% Autônomo e Seguro)**:
   - Funciona inteiramente no navegador via `LocalStorage`.
   - Pode ser aberto diretamente clicando duas vezes no arquivo `index.html` (não requer servidor, Node.js ou instalação de nada).
   - Não depende de internet nem de banco de dados externo.

2. **Gerenciamento Inteligente de Estoque**:
   - Painel para cadastrar novos brindes e definir a quantidade de cada um.
   - **Decremento automático**: A cada giro premiado, o brinde sorteado tem sua quantidade reduzida em 1.
   - **Roleta Dinâmica**: Quando o estoque de um brinde chega a **0**, ele é **automaticamente removido da roleta**, recalculando as fatias em tempo real apenas com os itens disponíveis!
   - Se todos os brindes acabarem, exibe aviso convidando o atendente a repor o estoque.

3. **Experiência Visual e Sonora Completa**:
   - Física de rotação realista com desaceleração dramática e ponteiro dourado vibrante.
   - Sons sintetizados em tempo real via **Web Audio API** (tique-taque mecânico ao passar pelos pinos e fanfarra de vitória ao parar no brinde), sem depender de arquivos de áudio externos.
   - Chuva de confetes coloridos e modal comemorativo para o cliente vencedor.
   - Modo **Tela Cheia (Fullscreen)** integrado no topo da página.

4. **Histórico e Backup**:
   - Aba com histórico de brindes sorteados com data e hora.
   - Opção para **Exportar Backup (JSON)** e **Importar**, facilitando migrar a lista de brindes para outro tablet ou dispositivo.
   - Botão para restaurar a qualquer momento a lista padrão de brindes da ótica.

---

## 🚀 Como Usar

### Opção 1: Uso Direto (Mais Fácil)
1. Localize a pasta `roleta` na sua área de trabalho: `/Users/m.dbranding/Desktop/roleta`.
2. Dê um duplo clique no arquivo **`index.html`**.
3. O navegador abrirá a roleta pronta para usar!

### Opção 2: Em Tablet / iPad no Balcão
1. Basta abrir a página no navegador do tablet (Chrome, Safari, Edge, etc.).
2. Clique no ícone de **Tela Cheia** no canto superior direito para transformar em modo quiosque.
3. Para configurar ou repor brindes, clique no botão **"Gerenciar Brindes"** no canto superior direito.

---

## 🎁 Brindes Pré-Configurados da Home Ótica
A aplicação já vem com sugestões temáticas cadastradas:
- 👓 *Kit Limpa Lentes Spray + Flanela* (20 un.)
- 🕶️ *Óculos de Sol Cortesia* (3 un.)
- 👝 *Estojo Rígido de Proteção* (15 un.)
- 🧵 *Cordão Salva-Óculos Estiloso* (12 un.)
- 🏷️ *Desconto R$ 50 na Armação* (10 un.)
- 🧴 *Flanela Microfibra Antiembaçante* (25 un.)
- 🏷️ *Desconto R$ 100 em Lentes Digitais* (5 un.)
- ☕ *Caneca Especial Home Ótica* (8 un.)

Você pode alterar nomes, quantidades, adicionar novos brindes ou remover qualquer um no botão **"Gerenciar Brindes"**.
