export function geraMargemHorario ( horaAgora: string ): string[] {

    let saidaDate = new Date( horaAgora );
    let chegadaDate = new Date( horaAgora );

    saidaDate.setUTCHours( saidaDate.getUTCHours() - 1 ); // estica a margem de saida 1 hora pra baixo
    chegadaDate.setUTCHours( chegadaDate.getUTCHours() + 1 ); //estica a margem de chegada 1 hora pra cima

    let margem = [ saidaDate.toISOString(), chegadaDate.toISOString() ];
    return margem;

}

export function reduzMargemHorario ( margem: string[], minutos: number ): string[] {

    let saidaDate = new Date( margem[ 0 ] );
    let chegadaDate = new Date( margem[ 1 ] );

    saidaDate.setUTCMinutes( saidaDate.getUTCMinutes() - minutos );
    chegadaDate.setUTCMinutes( chegadaDate.getUTCMinutes() - minutos );

    let margemReduzida = [ saidaDate.toISOString(), chegadaDate.toISOString() ];
    return margemReduzida;

}

export function esticaMargemHorario ( margem: string[], minutos: number ): string[] {

    let saidaDate = new Date( margem[ 0 ] );
    let chegadaDate = new Date( margem[ 1 ] );

    saidaDate.setUTCMinutes( saidaDate.getUTCMinutes() + minutos );
    chegadaDate.setUTCMinutes( chegadaDate.getUTCMinutes() + minutos );

    let margemReduzida = [ saidaDate.toISOString(), chegadaDate.toISOString() ];
    return margemReduzida;
}


export function geraHorariosParaBuscaSql (): string[] {

    let horaAgora = new Date();
    horaAgora.setUTCHours( horaAgora.getUTCHours() - 3 );
    horaAgora.setUTCMinutes( horaAgora.getUTCMinutes() - 30 );

    let agoraPoucoAMeiaHoraAtras: string = horaAgora.toISOString();

    horaAgora.setUTCHours( horaAgora.getUTCHours() - 1 );

    let agoraPoucoAumaHoraEmeiaAtras = horaAgora.toISOString();

    return [ agoraPoucoAMeiaHoraAtras, agoraPoucoAumaHoraEmeiaAtras ];
}
