import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import * as bluebird from 'bluebird';
import * as redis from 'redis';
import { redisCacheTime } from '../../common/redis.config';
bluebird.promisifyAll( redis.RedisClient.prototype );
bluebird.promisifyAll( redis.Multi.prototype );



export async function AviseQueEsseOnibusJaPassouAqui ( rotuloPonto: string, redisConnection ) {
    try {
        await redisConnection.setAsync( rotuloPonto, 'true', 'EX', redisCacheTime );
    } catch ( err ) {
        console.log( [ `[ onibusPassando ] Erro ao tentar salvar dados no cache do redis. ${err.message}` ] );
    }
}
