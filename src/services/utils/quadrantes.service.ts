export function quadranteDoPonto ( azimute: number ): string {
  if ( azimute == 0 ) {
    return "N";
  }
  if ( azimute > 0 && azimute < 90 ) {
    return "NE";
  }
  else if ( azimute == 90 ) {
    return "L";
  }
  if ( azimute > 90 && azimute < 180 ) {
    return "SE";
  }
  if ( azimute == 180 || azimute == -180 ) {
    return "S";
  }
  if ( azimute < 0 && azimute > -90 ) {
    return "NO";
  }
  if ( azimute == -90 ) {
    return "O";
  }
  if ( azimute < -90 && azimute > -180 ) {
    return "SO";
  }
}


export function quadranteDoVeiculo ( curso: number ): string {
  if ( curso == 0 || curso == 360 ) {
    return "N";
  }
  else if ( curso > 0 && curso < 90 ) {
    return "NE";
  }
  else if ( curso == 90 ) {
    return "L";
  }
  else if ( curso > 90 && curso < 180 ) {
    return "SE";
  }
  else if ( curso == 180 ) {
    return "S";
  }
  else if ( curso > 270 && curso < 360 ) {
    return "NO";
  }
  else if ( curso == 270 ) {
    return "O";
  }
  else if ( curso > 180 && curso < 270 ) {
    return "SO";
  }
}
