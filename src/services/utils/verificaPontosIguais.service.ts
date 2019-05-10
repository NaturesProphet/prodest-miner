
export function TodosOsPontosSaoIguais ( pontos: any[] ): boolean {
    try {
        let ponto = pontos[ 0 ].ponto_id;
        for ( let index = 1; index < pontos.length; index++ ) {
            if ( pontos[ index ].ponto_id != ponto ) {
                return false;
            }
        }
        return true;
    } catch ( erro ) {
        console.log( `[ TodosOsPontosSaoIguais ] Erro: ${erro.message}` );
        return false;
    }
}
