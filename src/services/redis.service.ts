import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import * as bluebird from 'bluebird';
import * as redis from 'redis';
bluebird.promisifyAll( redis.RedisClient.prototype );
bluebird.promisifyAll( redis.Multi.prototype );
import * as conf from '../common/redis.config';
import * as sqlService from './mssql.service';




export function getConnection () {

    let redisClient;
    const redisOptions = {
        host: conf.redisHost,
        port: conf.redisPort
    }

    try {
        redisClient = redis.createClient( redisOptions );
        return redisClient;
    } catch ( err ) {
        console.log( `Erro ao tentar abrir a conexão com o redis. ${err.message}` );
        process.exit( 1 );
    }
}


export async function sendPontosToRedis ( redisConnection ) {

    let pontos: any[];
    try {
        pontos = await sqlService.getPontos();
    } catch ( err ) {
        console.log( `Falha ao tentar recuperar a lista de pontos da api REST. ${err.message}` );
        process.exit( 1 );
    }
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


export async function getPontosProximos ( connection, LongLat ) {
    let long: number = LongLat.longitude;
    let lat: number = LongLat.latitude;
    try {
        let proximidades = await connection.georadiusAsync( conf.redisDicionario, long, lat, conf.redisRaio, 'm' );
        return proximidades;
    } catch ( err ) {
        console.log( `Erro ao fazer uma busca GEORADIUS no redis. ${err.message}` );
    }
}
