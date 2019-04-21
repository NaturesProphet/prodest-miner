import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import * as bluebird from 'bluebird';
import * as redis from 'redis';
import { ConnectionPool } from 'mssql';
import { getPontos } from 'services/mssql/getPontos.service';
bluebird.promisifyAll( redis.RedisClient.prototype );
bluebird.promisifyAll( redis.Multi.prototype );

export async function sendPontosToRedis ( pool: ConnectionPool, redisConnection ) {

    let pontos = await getPontos( pool );

    console.log( 'Carregando coordenadas de pontos no redis...' );

    for ( let ponto = 0; ponto < pontos.length; ponto++ ) {
        let id: number;
        if ( pontos[ ponto ].id != undefined ) {
            id = pontos[ ponto ].id
        }
        let longitude = pontos[ ponto ].longitude;
        let latitude = pontos[ ponto ].latitude;
        await redisConnection.geoaddAsync( 'pontos', longitude, latitude, id )

    }

    console.log( 'Redis carregado.' );
}
