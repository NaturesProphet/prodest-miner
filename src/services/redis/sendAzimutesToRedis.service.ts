import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
  dotenv.config();
}
import * as bluebird from 'bluebird';
import * as redis from 'redis';
import { ConnectionPool } from 'mssql';
import { getPontos } from '../../services/mssql/getPontos.service';
bluebird.promisifyAll( redis.RedisClient.prototype );
bluebird.promisifyAll( redis.Multi.prototype );

export async function sendAzimutesToRedis ( pool: ConnectionPool, redisConnection ) {

  let pontos = await getPontos( pool );

  console.log( 'Carregando azimutes dos pontos no redis...' );

  for ( let index = 0; index < pontos.length; index++ ) {
    let id: string;
    let azimute: string;
    if ( pontos[ index ].id != undefined ) {
      id = pontos[ index ].id
      azimute = pontos[ index ].azimute;
    }

    try {
      await redisConnection.setAsync( `azimute:${id}`, azimute );
    } catch ( err ) {
      console.log( `[ sendAzimutesToRedis ] Falha ao tentar carregar os `
        + `azimutes de pontos no redis. ${err.message}` );
    }
  }
  console.log( `Redis carregado com os azimutes de ${pontos.length} pontos.\n` );
}
