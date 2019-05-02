import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
  dotenv.config();
}
import { ConnectionPool } from 'mssql';
import { geraHorariosParaBuscaSql } from '../tempo/margensHorario.service';
import { listaViagensDaHora } from './listaViagensDaHora.service';
import { avisaNoTopico } from '../rabbitmq/avisaNoTopico.service';
import { Channel } from 'amqplib';
import { notifySlack } from '../slack/notifications';
import { SelecionaAsQueTemRegistroDeAtividade } from './SelecionaAsQueTemRegistroDeAtividade.service';

export async function processaViagensTerminadas ( pool: ConnectionPool, fila: Channel ) {

  let intervaloDeTempo: string[];
  let viagensPrevistas: number[];
  let viagensDetectadas: number[];
  let inicio: Date = new Date();
  inicio.setUTCHours( inicio.getUTCHours() - 3 )
  let logDeExecucao: string = '\n**********************************************************\n\n' +
    '                       [ MINER ]\n'
    + `              [ ${inicio.toISOString()} ]\n`


  /**
   * pergunta 1: Que viagens deveriam ter acabado na ultima hora, considerando que
   * essas viagens possam ter se atrasado em até meia hora para terminar ?
   */
  intervaloDeTempo = geraHorariosParaBuscaSql();


  viagensPrevistas = await listaViagensDaHora( pool, intervaloDeTempo );
  if ( viagensPrevistas != undefined && viagensPrevistas.length > 0 ) {
    logDeExecucao += `\nViagens previstas para a ultima hora: ${viagensPrevistas.length}\n`;
  } else {
    logDeExecucao += `Nenhum dado de viagem encontrado para a ultima hora.\n`
      + `Verifique se o job do PDI está carregando o banco normalmente..\n`;
  }



  /**
   * Pergunta 2: quais viagens previstas foram detectadas no realtime?
   */
  if ( viagensPrevistas != undefined && viagensPrevistas.length > 0 ) {

    viagensDetectadas = await SelecionaAsQueTemRegistroDeAtividade( pool, viagensPrevistas );

    if ( viagensDetectadas != undefined && viagensDetectadas.length > 0 ) {
      logDeExecucao += `Viagens previstas detectadas em atividade no realtime: ${viagensDetectadas.length}\n`;
      let ratio: number = ( viagensDetectadas.length / viagensPrevistas.length ) * 100;
      logDeExecucao += `-------------------------------------------------------------------------------\n`;
      logDeExecucao += `Total de viagens que aconteceram como o planejado: ${ratio.toFixed( 2 )}%`;
    }
    else {
      logDeExecucao += `\nNão foi encontrada NENHUMA viagem prevista no realtime. `
        + `Verifique os logs de erro do Miner no rancher.`;
    }
  }


  // alimenta o gera-historico-real através da fila
  if ( viagensDetectadas != undefined && viagensDetectadas.length > 0 ) {
    viagensDetectadas.forEach( viagemId => {
      avisaNoTopico( fila, viagemId );
    } );
  }

  logDeExecucao += `\n-------------------------------------------------------------------------------\n\n`;
  notifySlack( logDeExecucao, 'Nota' );
}
