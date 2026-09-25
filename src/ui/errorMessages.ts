import type { DomainError } from '../domain';

export const ERROR_MESSAGES: Record<DomainError, string> = {
  INVALID_LENGTH: 'La medida debe ser mayor que 0.',
  INVALID_NAME: 'El nombre no puede estar vacío.',
  NOT_ENOUGH_SEGMENTS: 'Hacen falta al menos 2 tramos para cerrar el perímetro.',
  PERIMETER_ALREADY_CLOSED: 'El perímetro ya está cerrado.',
  PERIMETER_NOT_CLOSED: 'Primero cierra el perímetro.',
  SEGMENT_NOT_FOUND: 'Ese tramo ya no existe.',
  SEGMENT_NOT_MOVABLE: 'No se puede mover tanto: alguna pared vecina desaparecería.',
  PARTITION_NOT_FOUND: 'Ese tabique ya no existe.',
  PARTITION_OUTSIDE_PERIMETER: 'El tabique no puede salir del perímetro.',
  WALL_NOT_FOUND: 'Esa pared ya no existe.',
  OPENING_NOT_FOUND: 'Ese hueco ya no existe.',
  INVALID_OPENING_SIZE: 'Las medidas del hueco no son válidas.',
  OPENING_OUT_OF_WALL: 'El hueco no cabe en la pared.',
  OPENING_OVERLAP: 'El hueco se solapa con otro.',
  ZONE_NOT_FOUND: 'Esa zona ya no existe.',
  INVALID_ZONE: 'La zona necesita al menos 3 puntos y algo de superficie.',
  VERSION_NOT_FOUND: 'Esa versión ya no existe.',
  LAST_VERSION: 'No se puede borrar la única versión.',
  FURNITURE_NOT_FOUND: 'Ese mueble ya no existe.',
};
