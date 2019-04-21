import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import * as bluebird from 'bluebird';
import * as redis from 'redis';
bluebird.promisifyAll( redis.RedisClient.prototype );
bluebird.promisifyAll( redis.Multi.prototype );
import * as conf from '../../common/redis.config';


export async function getPontosProximos ( redisConnection, LongLat ) {
    let long: number = LongLat.longitude;
    let lat: number = LongLat.latitude;
    try {
        let proximidades = await redisConnection.georadiusAsync( conf.redisDicionario, long, lat, conf.redisRaio, 'm' );
        return proximidades;
    } catch ( err ) {
        console.log( `Erro ao fazer uma busca GEORADIUS no redis. ${err.message}` );
    }
}
