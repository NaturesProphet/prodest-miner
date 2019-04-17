# Miner

Serviço que minera os dados do segundo tópico do realtime, filtrando os veiculos que estão perto de algum ponto de parada e repassando os dados para uma segunda fila no rabbit, de onde serão processados para gerar dados de historico em outro serviço.