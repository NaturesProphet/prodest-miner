export function isPontoInicial ( datahora: number, horaSaida: string ): boolean {
    let horaInicioMillis: number = new Date( horaSaida ).getTime();
    //15 minutos de margem
    let margemInferior = horaInicioMillis - ( ( 60 * 1000 ) * 15 );
    let margemSuperior = horaInicioMillis + ( ( 60 * 1000 ) * 15 );

    if ( datahora > margemInferior && datahora < margemSuperior ) {
        return true
    } else {
        return false
    }
}



export function isPontoFinal ( datahora: number, horaChegada: string ): boolean {
    let horaChegadaMillis: number = new Date( horaChegada ).getTime();
    //15 minutos de margem
    let margemInferior = horaChegadaMillis - ( ( 60 * 1000 ) * 15 );
    let margemSuperior = horaChegadaMillis + ( ( 60 * 1000 ) * 15 );

    if ( datahora > margemInferior && datahora < margemSuperior ) {
        return true
    } else {
        return false
    }
}