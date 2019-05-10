import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
  dotenv.config();
}
import * as bluebird from 'bluebird';
import * as redis from 'redis';
bluebird.promisifyAll( redis.RedisClient.prototype );
bluebird.promisifyAll( redis.Multi.prototype );

export async function getAzimute ( pontoId: string, redisConnection ): Promise<number> {


  try {
    let azimute = await redisConnection.getAsync( `azimute:${pontoId}` );
    if ( azimute == null || azimute == undefined ) {
      throw new Error( 'Azimute NULL' );
    }
    return Number( azimute );
  } catch ( err ) {
    console.log( `[ getAzimutes ] Falha ao tentar recuperar o `
      + `azimute do ponto ${pontoId} no redis. ${err.message}` );
    return null;
  }
}

