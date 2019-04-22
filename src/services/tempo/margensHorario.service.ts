export function geraMargemHorario ( horaAgora: string ): string[] {

    let saidaDate = new Date( horaAgora );
    let chegadaDate = new Date( horaAgora );

    saidaDate.setUTCHours( saidaDate.getUTCHours() - 2 ); // estica a margem de saida 2 horas pra baixo
    chegadaDate.setUTCHours( chegadaDate.getUTCHours() + 2 ); //estica a margem de chegada 2 horas pra cima

    let margem = [ saidaDate.toISOString(), chegadaDate.toISOString() ];
    return margem;

}

export function reduzMargemHorario ( margem: string[] ): string[] {

    let saidaDate = new Date( margem[ 0 ] );
    let chegadaDate = new Date( margem[ 1 ] );

    saidaDate.setUTCMinutes( saidaDate.getUTCMinutes() - 30 );
    chegadaDate.setUTCMinutes( chegadaDate.getUTCMinutes() - 30 );

    let margemReduzida = [ saidaDate.toISOString(), chegadaDate.toISOString() ];
    return margemReduzida;

}

export function esticaMargemHorario ( margem: string[] ): string[] {

    let saidaDate = new Date( margem[ 0 ] );
    let chegadaDate = new Date( margem[ 1 ] );

    saidaDate.setUTCHours( saidaDate.getUTCHours() + 1 );
    chegadaDate.setUTCHours( chegadaDate.getUTCHours() + 1 );

    let margemReduzida = [ saidaDate.toISOString(), chegadaDate.toISOString() ];
    return margemReduzida;
}
