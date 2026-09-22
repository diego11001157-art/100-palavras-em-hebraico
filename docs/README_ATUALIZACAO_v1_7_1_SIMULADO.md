# ALEF — atualização v1.7.1 | Vocabulário 76–80 + Simulado

Esta atualização mantém o aplicativo v1.7 e acrescenta o Vocabulário 6 (16), as palavras 76–80 e a área **Simulado da Prova**, elaborada a partir de `Simulado 1.pdf` enviado pelo usuário.

## Atualizar seu GitHub Pages

Repositório: `diego11001157-art/100-palavras-em-hebraico`.

1. Faça um backup da pasta `docs` do repositório.
2. Extraia **Alef_v1_7_1_Vocabulario_76_a_80_Atualizacao_GitHub.zip**.
3. Copie/mescle os arquivos extraídos da pasta `docs/` com os da pasta `docs/` do repositório, **substituindo arquivos de mesmo nome** e **adicionando `docs/simulado.js`**.
4. Não apague os arquivos antigos não incluídos neste pacote, como `docs/config.js`, `docs/icons/` e os demais JSON de conteúdo.
5. Faça commit no GitHub; se o Pages publica da branch `main`, pasta `/docs`, aguarde a publicação. Em aparelhos com aplicativo instalado, feche e reabra a PWA para carregar o novo service worker; se necessário, atualize a página.

## Arquivos alterados / novos

- `docs/index.html` — entrada Simulado na página inicial, barra inferior e seção separada.
- `docs/app.js` — inicialização e abertura do módulo.
- `docs/simulado.js` — NOVO: as sete etapas, correção pedagógica e armazenamento local.
- `docs/styles.css` — estilo responsivo do simulado.
- `docs/service-worker.js` — cache `alef-v1.7.1-vocab80-simulado` e pré-cache do arquivo novo.
- `docs/content/vocabulario.json` — cinco novas palavras, numeração 76–80.
- `docs/content/version.json` — versão 1.7.1, 80 palavras.

## Como o simulado funciona

As sete etapas seguem o documento do professor: I vocabulário (dez termos originais / sorteio entre 80 / blocos 71–80 e 76–80), II troncos verbais (raiz קטל / שמר / כתב ou raiz livre), III análise verbal, IV relacionar conceitos, V tradução de dois salmos, VI volitivas em 1Rs 21:2 e VII exemplos bíblicos de wayyiqtol.

As etapas I–IV têm comparação comentada dos campos verificáveis. Traduções livres, glosas da raiz personalizada e atividades abertas são revisadas pelo aluno: **não recebem nota automática**, pois diferentes formulações e contextos podem ser válidos. Os rótulos de modo/voz e as glosas da etapa II são um modelo de estudo, não significados universais de cada tronco. Em III, תִּקְטֹל pode ser 2ª masc. sing. ou 3ª fem. sing. sem contexto.

As respostas do simulado ficam no armazenamento **deste navegador e dispositivo**, separadas por usuário autenticado. Não são enviadas ao Firebase nem dão XP. Apagar os dados do navegador também apaga esse histórico local.

## Verificações

Testes de sintaxe de JavaScript e de integração local com Chromium, usando dados JSON reais e autenticação Firebase simulada. A autenticação real, as regras de segurança e a publicação remota do GitHub Pages não foram testadas neste ambiente.
