import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import * as bluebird from 'bluebird';
import * as redis from 'redis';
bluebird.promisifyAll( redis.RedisClient.prototype );
bluebird.promisifyAll( redis.Multi.prototype );
import * as conf from '../../common/redis.config';


export function IniciaConexaoRedis () {
    const redisOptions = {
        host: conf.redisHost,
        port: conf.redisPort
    }
    try {
        let redisClient = redis.createClient( redisOptions );
        return redisClient;
    } catch ( err ) {
        console.log( `[ IniciaConexaoRedis ] Erro ao tentar abrir a conexão com o redis. ${err.message}` );
    }
}