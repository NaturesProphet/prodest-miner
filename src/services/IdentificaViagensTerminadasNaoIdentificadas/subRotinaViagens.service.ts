import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
  dotenv.config();
}
import { ConnectionPool } from 'mssql';
import { geraHorariosParaBuscaSql } from '../tempo/margensHorario.service';
import { listaViagensDaHora } from './listaViagensDaHora.service';
import { listaHistoricosDaUltimaHora } from './listaHistoricosDaUltimaHora.service';
import { listaViagensPrevistasSemHistorico } from './listaViagensNaoProcessadas.service';
import { avisaNoTopico } from '../../services/rabbitmq/avisaNoTopico.service';
import { Channel } from 'amqplib';
import { notifySlack } from '../../services/slack/notifications';
import { SelecionaAsQueTemRegistroDeAtividade } from './SelecionaAsQueTemRegistroDeAtividade.service';

export async function processaViagensNaoIdentificadas ( pool: ConnectionPool, fila: Channel ) {

  let intervaloDeTempo: string[];
  let viagensPrevistas: number[];
  let viagensPrevistasComHistorico: number[];
  let viagensPrevistasSemHistorico: number[];
  let viagensPrevistasSemHistoricoComAtividadeDetectada: number[];
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
    viagensPrevistasComHistorico = await listaHistoricosDaUltimaHora( pool, intervaloDeTempo );
    if ( viagensPrevistasComHistorico.length > 0 ) {
      logDeExecucao += `Desse total, a subrotina detectou que ${viagensPrevistasComHistorico.length} `
        + `dessas viagens foram realmente realizadas, com os respectivos veiculos planejados.\n`;
      let ratio: number = ( viagensPrevistasComHistorico.length / viagensPrevistas.length ) * 100;
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

    if ( viagensPrevistasComHistorico != undefined && viagensPrevistasComHistorico.length > 0 ) {

      viagensPrevistasSemHistorico = await listaViagensPrevistasSemHistorico
        ( pool, viagensPrevistas, viagensPrevistasComHistorico );

    } else {
      viagensPrevistasSemHistorico = viagensPrevistas;
    }

    logDeExecucao += `\nUm total de ${viagensPrevistasSemHistorico.length} viagens `
      + `não possuiam Historico Real processado.\n`;
  }



  /**
   * pergunta 4: Quais dessas viagens sem Historico Real gerado tem algum 
   * registro de atividade no historico bruto ?
   */
  if ( viagensPrevistasSemHistorico != undefined && viagensPrevistasSemHistorico.length > 0 ) {


    viagensPrevistasSemHistoricoComAtividadeDetectada =
      await SelecionaAsQueTemRegistroDeAtividade( pool, viagensPrevistasSemHistorico );
    if (
      viagensPrevistasSemHistoricoComAtividadeDetectada != undefined &&
      viagensPrevistasSemHistoricoComAtividadeDetectada.length > 0 ) {
      logDeExecucao += `Das ${viagensPrevistasSemHistorico.length} viagens previstas `
        + `que não tiveram histórico gerado automaticamente, foram encontrados `
        + `${viagensPrevistasSemHistoricoComAtividadeDetectada.length} registros `
        + `de atividade recente dentro do intervalo procurado nos dados de histórico bruto.\n`;
      let ratioParcial = ( viagensPrevistasSemHistoricoComAtividadeDetectada.length /
        viagensPrevistasSemHistorico.length ) * 100;
      logDeExecucao += `Isso significa que ${ratioParcial.toFixed( 2 )}% das `
        + `${viagensPrevistasSemHistorico.length} viagens sem histórico ainda podem ter `
        + `seus Históricos gerados parcialmente e portanto foram entregues à fila.\n`;
      let total = viagensPrevistasComHistorico.length
        + viagensPrevistasSemHistoricoComAtividadeDetectada.length;
      let razaoGeral = ( total / viagensPrevistas.length ) * 100;
      logDeExecucao += `\n\nRESUMO DA EXECUÇÃO:\n`
        + `Viagens totais previstas: ${viagensPrevistas.length}\n`
        + `Viagens COM Histórico Real (automáticos) ANTES da subrotina: `
        + `${viagensPrevistasComHistorico.length}\n`
        + `Viagens COM Histórico Real processados após a subrotina (TOTAL): ${total}\n`
        + `Total de Viagens Previstas do intervalo detectadas `
        + `no sistema real-time: ${razaoGeral.toFixed( 2 )}%\n\n`;
      viagensPrevistasSemHistoricoComAtividadeDetectada.forEach( element => {
        avisaNoTopico( fila, element )
      } );
    }
  }





  let fim = new Date();
  fim.setUTCHours( fim.getUTCHours() - 3 );
  logDeExecucao += `\n[ ${fim.toISOString()} ]\nSub-rotina de detecção de viagens `
    + `terminou de processar o intervalo atual de tempo.\n`
    + `-------------------------------------------------------------------------------`;
  notifySlack( logDeExecucao, 'Nota' );
}
