# Whistle ABC

Cole um tune em notação [ABC](https://abcnotation.com/) e receba a partitura com a
**digitação de tin whistle** embaixo — em Ré, Dó ou outra afinação. Transponha e
exporte em SVG, PNG ou PDF. Roda inteiramente no navegador.

Feito para os tunes do [thesession.org](https://thesession.org/tunes) (ex.:
[Drowsy Maggie](https://thesession.org/tunes/27)). É a versão moderna e viva do
antigo `abcconverter.php` do mandolintab.net, que parou em 2012.

## Como funciona

- **Partitura:** renderizada com [abcjs](https://www.abcjs.net/), que também cuida
  do transpose visual.
- **Digitação:** gerada aqui. Todo whistle de seis furos é o mesmo instrumento
  deslocado em altura, então uma única tabela de digitação serve para qualquer
  afinação — muda só a nota de "todos os furos fechados" (Ré no whistle de D, Dó
  no de C). Para cada nota calculamos `offset = altura − tônica do whistle` e
  buscamos o padrão de furos correspondente (0 a 24 semitons, duas oitavas).
- **Alcance:** notas fora do alcance do instrumento escolhido aparecem na tira de
  digitação com um ✕ — por exemplo, o `A,`/`C` grave de Drowsy Maggie não cabe
  num whistle de Ré.
- **Erros:** um leitor de ABC próprio e focado extrai as notas na ordem tocada,
  aplica a armadura de clave e os acidentes de compasso, e reporta em texto claro
  qualquer símbolo que não soube ler.

## Instrumentos e controles

- **Tablatura:** tin whistle de 6 furos ou ocarina de 12 furos (Dó).
- **Afinação do whistle:** conjunto cromático completo (C, C♯, D, E♭, E, F, F♯, G,
  A♭, A, B♭, B). Padrão: Ré. Para a ocarina a afinação é fixa em Dó.
- **Transpor:** de "Descer 2 oitavas" a "Subir 2 oitavas", em semitons de 1 a 11
  para cada lado mais as duas oitavas cheias.
- **Exportar:** SVG, PNG e PDF, com escolha de papel A4 ou Carta.

## A ocarina de 12 furos

Todos os furos fechados soam **Lá** (os dois subfuros estendem a tessitura uma
terça menor abaixo do dó), e o alcance vai de Lá a Fá — 21 semitons. As notas
naturais seguem o sistema linear padrão (abre-se os furos em ordem fixa: subfuros,
mão direita, mão esquerda, polegares); os acidentes usam meio-furo no furo de
transição e ficam marcados, porque a digitação exata varia entre instrumentos.
O diagrama é esquemático, não a foto de um modelo específico.

## Rodando localmente

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm test         # testes unitários (Vitest)
npm run build    # build de produção em dist/
```

## Deploy no GitHub Pages

O workflow em `.github/workflows/deploy.yml` roda os testes, faz o build e publica
`dist/` no GitHub Pages a cada push na branch `main`. Basta habilitar Pages no
repositório com a fonte **GitHub Actions**. O `base: "./"` do Vite mantém os
caminhos relativos, então funciona tanto em `usuario.github.io/repositorio/`
quanto num host estático simples.

## Estrutura

```
src/music/    leitura de ABC, alturas e armadura de clave (testado)
src/whistle/  tabela de digitação, mapeamento e render SVG da tablatura (testado)
src/ui/       interface, glue com abcjs e exportação SVG/PNG/PDF
test/         testes unitários e as duas tunes de referência como fixtures
```

## Licença

MIT.
