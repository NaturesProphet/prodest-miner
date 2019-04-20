import * as request from 'request-promise';
import { pontosRestURL } from '../common/rest.config';


async function getPontos (): Promise<any> {

    const options = {
        uri: pontosRestURL,
        headers: {
            'User-Agent': 'Request-Promise',
        },
        json: true
    }
    let pontos;
    let errorCount: number = 0;

    while ( pontos == undefined ) {
        let lastError: Error;
        try {
            pontos = await request.get( options );
        } catch ( err ) {
            errorCount++;
            lastError = err;
        }
        if ( errorCount > 20 ) {
            throw lastError
        }
    }
    return pontos;
}
