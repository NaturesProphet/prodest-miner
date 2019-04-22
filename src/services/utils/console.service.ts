import { consoleLevel } from "../../common/env.config";

export function debug ( nivel: number, msg: string ) {
    if ( consoleLevel == 2 ) {
        console.log( msg );
    }
}
