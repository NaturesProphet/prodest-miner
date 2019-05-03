[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

# Miner

Serviço que minera os dados do segundo tópico do realtime, filtrando os veiculos que estão perto de algum ponto de parada e repassando os dados para uma segunda fila no rabbit, de onde serão processados para gerar dados de historico em outro serviço.

## Variaveis de ambiente

crie um arquivo chamado '.env' e o configure conforme o conteúdo de exemplo disponivel na raiz do repositório: .env.example.

# Um ponto criticamente sensível do projeto

Na altura da linha 150 do src/main.ts, o algoritmo tem uma viagem válida identificada, um veículo válido identificado, e uma lista de pontos de ônibus nas proximidades do local onde o veículo está passando.

Problemas para identificar o ponto correto e a sequência nessa lista:

1. Mais de um ponto válido na mesma área (30 metros)
   
    > O raio de busca de pontos próximos está configurado para 30 metros. se for maior, pegaríamos muito lixo, e se for menor, perderíamos muitos dados caso o onibus passe pelo ponto em grande velocidade. 
    
    > Neste raio, frequentemente são identificados casos, como por exemplo grandes avenidas, onde há dois pontos válidos na viagem, onde um está em uma mão e a outra na mão oposta, com os dois pontos um de frente para o outro.
    
    > Neste tipo de situação, existem dois pontos válidos e fica pouco prático identificar qual dos dois pontos é o ponto que o onibus está efetivamente passando no momento.

2. Pontos válidos muito próximos
    > Existem casos onde o ônibus para em dois pontos válidos muito próximos um do outro, mas no mesmo sentido, diferente do problema 1. Em tese, é um problema solucionável com a redução do raio de busca para 20 metros, mas isso geraria perda de dados em muitos outros casos, como por exemplo, a rodovia do contorno, onde os onibus passam em velocidades altas por varios pontos válidos, e um raio curto causaria a perda da transmissão no raio desses pontos.

3. Um ônibus pode passar pelo mesmo ponto de ônibus diversas vezes durane A MESMA VIAGEM. 

    > Se um mesmo ponto pode estar varias vezes na mesma viagem, com sequências deferentes, a identificação dele na lista é possível, mas a informação da sequência é deixada nula.
  
4. Um ponto de ônibus pode ser o ponto inicial e o ponto final da mesma viagem.
   
    > Parecido com o problema 3, mas em pontos extremos do plano. Para resolver esse problema, estou verificando o horário em que o onibus esteve neste ponto e comparando com as horas de inicio e fim da viagem, para assim identificar essa informação.

