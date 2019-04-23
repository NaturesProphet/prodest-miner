import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import * as bluebird from 'bluebird';
import * as redis from 'redis';
bluebird.promisifyAll( redis.RedisClient.prototype );
bluebird.promisifyAll( redis.Multi.prototype );



export async function onibusJaPassou ( rotuloPonto: string, redisConnection ): Promise<boolean> {
    try {
        let info = await redisConnection.getAsync( rotuloPonto );
        if ( info == 'true' ) {
            return true
        } else {
            return false
        }
    } catch ( err ) {
        console.log( `[ checkCache ] Erro ao tentar buscar dados no redis. ${err.message}` );
    }
}
