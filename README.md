[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

# Miner

Serviço que minera os dados do segundo tópico do realtime, filtrando os veiculos que estão perto de algum ponto de parada e repassando os dados para uma segunda fila no rabbit, de onde serão processados para gerar dados de historico em outro serviço.

## Variaveis de ambiente

crie um arquivo chamado '.env' e o configure conforme o conteúdo de exemplo disponivel na raiz do repositório: .env.example.