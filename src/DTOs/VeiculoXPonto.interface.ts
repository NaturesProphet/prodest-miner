export interface VeiculoXPonto {
    rotulo: string;
    datahoraMillis: number;
    datahoraLegivel: string;
    velocidade: number;
    ignicao: 1 | 0;
    pontoId: number;
    itinerarioId: number;
    viagemId: number;
    pontoInicial: 1 | 0;
    pontoFinal: 1 | 0;
    sequencia: number;
}
