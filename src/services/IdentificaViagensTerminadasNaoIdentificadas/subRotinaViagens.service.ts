import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
  dotenv.config();
}
import { ConnectionPool } from 'mssql';
import { geraHorariosParaBuscaSql } from '../tempo/margensHorario.service';
import { listaViagensDaHora } from './listaViagensDaHora.service';
import { listaHistoricosDaUltimaHora } from './listaHistoricosDaUltimaHora.service';
import { listaViagensNaoProcessadas } from './listaViagensNaoProcessadas.service';
import { avisaNoTopico } from '../../services/rabbitmq/avisaNoTopico.service';
import { Channel } from 'amqplib';
import { notifySlack } from '../../services/slack/notifications';

export async function processaViagensNaoIdentificadas ( pool: ConnectionPool, fila: Channel ) {

  let intervaloDeTempo: string[];
  let viagensPrevistas: number[];
  let viagensComHistorico: number[];
  let viagensPrevistasNaoProcessadas: number[];
  let inicio: Date = new Date();
  inicio.setUTCHours( inicio.getUTCHours() - 3 )
  let logDeExecucao: string = '**********************************************************\n' +
    '                       [ MINER ]\n'
    + `              [ ${inicio.toISOString()} ]\n`
    + `Sub-rotina de identificação de viagens não processadas foi iniciada.\n\n`;


  /**
   * pergunta 1: Que viagens deveriam ter acabado na ultima hora, considerando que
   * essas viagens possam ter se atrasado em até meia hora para terminar ?
   */
  intervaloDeTempo = geraHorariosParaBuscaSql();
  logDeExecucao += `Tentou Buscar fatos ocorridos no intervalo:\n`
    + `<${intervaloDeTempo[ 0 ]}> até <${intervaloDeTempo[ 1 ]}>\n-------------\n`;

  viagensPrevistas = await listaViagensDaHora( pool, intervaloDeTempo );
  if ( viagensPrevistas != undefined && viagensPrevistas.length > 0 ) {
    logDeExecucao += `\nTotal de viagens que teoricamente `
      + `deveriam ter acabado neste intervalo: ${viagensPrevistas.length}\n`;
  } else {
    logDeExecucao += `A query não achou nenhuma viagem planejada para esse intervalo..`
      + ` O BANCO ESTÁ MESMO CARREGADO COM OS DADOS DE HOJE ? Verifique o job do PDI,\n`
  }


  /**
   * pergunta 2: Quais viagens no mesmo intervalo de tempo já tiveram os seus Historicos
   * devidamente processados e salvos no banco de historicos reais ?
   */
  if ( viagensPrevistas != undefined && viagensPrevistas.length > 0 ) {
    viagensComHistorico = await listaHistoricosDaUltimaHora( pool, intervaloDeTempo );
    if ( viagensComHistorico.length > 0 ) {
      logDeExecucao += `Desse total, a subrotina detectou que ${viagensComHistorico.length} `
        + `dessas viagens foram realmente realizadas, com os respectivos veiculos planejados.\n`;
      let ratio: number = ( viagensComHistorico.length / viagensPrevistas.length ) * 100;
      logDeExecucao += `Os dados sugeriram que ${ratio.toFixed( 2 )}% das viagens planejadas `
        + `neste intervalo aconteceram próximo do esperado na programação de viagens `
        + `que foi recebida da GeoControl.\n`
        + `Nota: Alterações de veículos não previstos para as viagens não entram nessa conta.\n`;
    } else {
      logDeExecucao += `Nenhuma dessas viagens foi encontrada dentro do histórico real...\n`
    }

  }





  /**
   * pergunta 3: Quais viagens previstas ainda não tem histórico ?
   */
  if ( viagensPrevistas != undefined && viagensPrevistas.length > 0 ) {

    if ( viagensComHistorico != undefined && viagensComHistorico.length > 0 ) {

      viagensPrevistasNaoProcessadas = await listaViagensNaoProcessadas
        ( pool, viagensPrevistas, viagensComHistorico );

    } else {
      viagensPrevistasNaoProcessadas = viagensPrevistas;
    }
    viagensPrevistasNaoProcessadas.forEach( element => {
      avisaNoTopico( fila, element );
    } );
    logDeExecucao += `\n\nUm total de ${viagensPrevistasNaoProcessadas.length} viagens `
      + `não possuiam um histórico identificado automaticamente, e foram entregues `
      + `à fila de processamento para serem processadas pelo serviço de histórico.\n`
  }
  let fim = new Date();
  fim.setUTCHours( fim.getUTCHours() - 3 );
  logDeExecucao += `\n[ ${fim.toISOString()} ]\nSub-rotina de detecção de viagens `
    + `terminou de processar o intervalo atual de tempo.\n`
    + `-------------------------------------------------------------------------------`;
  notifySlack( logDeExecucao, 'nota' );
}