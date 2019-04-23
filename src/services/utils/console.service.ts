import { consoleLevel } from "../../common/env.config";

export function debug ( nivel: number, msg: string ) {
    if ( consoleLevel == nivel ) {
        console.log( msg );
    }
}
