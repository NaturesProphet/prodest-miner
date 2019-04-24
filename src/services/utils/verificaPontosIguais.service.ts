
export function osPontosSaoIguais ( pontos: any[] ): boolean {
    let ponto = pontos[ 0 ].ponto_id;
    for ( let index = 1; index < pontos.length; index++ ) {
        if ( ponto[ index ].ponto_id != ponto ) {
            return false;
        }
    }
    return true;
}
