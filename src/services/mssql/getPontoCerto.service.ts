import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import { ConnectionPool } from 'mssql';
import { PontoXOrdem } from 'DTOs/PontoXOrdem.interface';
import { osPontosSaoIguais } from 'services/utils/verificaPontosIguais.service';
import { qualFoiAUltimaSequencia } from './qualFoiAUltimaSequencia.service';


export async function getPontoCerto ( pool: ConnectionPool, itinerarioId: number, pontos: any[] ): Promise<PontoXOrdem> {

    try {
        let query = `SELECT ponto_id, ordem FROM itinerario_ponto `
            + `WHERE itinerario_id = ${itinerarioId} AND `
            + `ponto_id IN ( ${pontos} )`;

        let result = await pool.request().query( query );

        if ( result.recordset != undefined && result.recordset.length > 0 ) {


            if ( result.recordset.length == 1 ) {
                let pontoOrdem: PontoXOrdem = {
                    ponto: result.recordset[ 0 ].ponto_id,
                    ordem: result.recordset[ 0 ].ordem
                }
                return pontoOrdem;
            }


        } else if ( result.recordset != undefined && result.recordset.length > 1 ) {
            if ( osPontosSaoIguais( result.recordset ) ) {
                if ( result.recordset.length == 2 ) {
                    let ultimaOrdem: number = await qualFoiAUltimaSequencia( pool, itinerarioId );
                    if ( ultimaOrdem != undefined ) {
                        if ( ultimaOrdem < result.recordset[ 0 ].ordem ) {
                            let pontoOrdem: PontoXOrdem = {
                                ponto: result.recordset[ 0 ].ponto_id,
                                ordem: result.recordset[ 0 ].ordem
                            }
                            return pontoOrdem;
                        } else {
                            let pontoOrdem: PontoXOrdem = {
                                ponto: result.recordset[ 0 ].ponto_id,
                                ordem: result.recordset[ 1 ].ordem
                            }
                            return pontoOrdem;
                        }
                    }
                }

                let pontoOrdem: PontoXOrdem = {
                    ponto: result.recordset[ 0 ].ponto_id,
                    ordem: null
                }
                return pontoOrdem;


            } else {
                let pontoOrdem: PontoXOrdem = {
                    ponto: null,
                    ordem: null
                }
                return pontoOrdem;
            }

        }
    } catch ( err ) {
        let msg = `[ getSequenciaPontos ] Erro ao consultar sequencia de pontos no banco estático\n${err.message}`;
        console.log( msg );
    }
}
