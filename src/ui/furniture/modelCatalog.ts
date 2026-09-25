import type { CatalogItem } from './catalog';

/** Realistic models: Kenney Furniture Kit (CC0, kenney.nl), stored in public/models/kenney. */
export const MODELS_BASE_URL = '/models/kenney/';
/** The kit is modelled at about half scale: 1 unit ≈ 2 m. */
export const MODEL_SCALE = 2;
/** Plan colour of model pieces (their 3D look comes from the model itself). */
const MODEL_PLAN_COLOR = '#d6cfc2';

type ModelRow = Omit<CatalogItem, 'color'>;

/**
 * Sizes (cm) are the model's real bounding box × MODEL_SCALE and cannot be edited.
 * `center` is the footprint centre in model units (generated from each .glb file).
 */
const ROWS: ModelRow[] = [
  { id: 'model-loungeSofa', name: 'Sofá', category: 'Salón', width: 196, depth: 82, height: 92, model: { file: 'loungeSofa', center: [0.49, 0, -0.205] } },
  { id: 'model-loungeSofaLong', name: 'Sofá largo', category: 'Salón', width: 196, depth: 164, height: 92, model: { file: 'loungeSofaLong', center: [0.49, 0, 0] } },
  { id: 'model-loungeSofaCorner', name: 'Sofá rinconera', category: 'Salón', width: 196, depth: 196, height: 92, model: { file: 'loungeSofaCorner', center: [0.49, 0, -0.49] } },
  { id: 'model-loungeDesignSofa', name: 'Sofá de diseño', category: 'Salón', width: 224, depth: 82, height: 80, model: { file: 'loungeDesignSofa', center: [0.56, 0, -0.205] } },
  { id: 'model-loungeChair', name: 'Sillón', category: 'Salón', width: 98, depth: 82, height: 92, model: { file: 'loungeChair', center: [0.245, 0, -0.205] } },
  { id: 'model-loungeChairRelax', name: 'Sillón relax', category: 'Salón', width: 98, depth: 135, height: 126, model: { file: 'loungeChairRelax', center: [0.245, 0, -0.3373] } },
  { id: 'model-tableCoffee', name: 'Mesa de centro', category: 'Salón', width: 132, depth: 80, height: 46, model: { file: 'tableCoffee', center: [-0.1305, 0, -0.1] } },
  { id: 'model-tableCoffeeGlass', name: 'Mesa de centro cristal', category: 'Salón', width: 132, depth: 80, height: 46, model: { file: 'tableCoffeeGlass', center: [-0.1305, 0, -0.1] } },
  { id: 'model-cabinetTelevision', name: 'Mueble TV', category: 'Salón', width: 160, depth: 50, height: 62, model: { file: 'cabinetTelevision', center: [0.4, 0, -0.125] } },
  { id: 'model-televisionModern', name: 'Televisor', category: 'Salón', width: 137, depth: 26, height: 91, model: { file: 'televisionModern', center: [0, 0, 0] } },
  { id: 'model-bookcaseOpen', name: 'Estantería', category: 'Salón', width: 80, depth: 50, height: 176, model: { file: 'bookcaseOpen', center: [0.2, 0, -0.125] } },
  { id: 'model-lampRoundFloor', name: 'Lámpara de pie', category: 'Salón', width: 30, depth: 35, height: 172, model: { file: 'lampRoundFloor', center: [0.06, 0, -0.06] } },
  { id: 'model-pottedPlant', name: 'Planta', category: 'Salón', width: 42, depth: 48, height: 131, model: { file: 'pottedPlant', center: [0, 0, 0] } },
  { id: 'model-rugRectangle', name: 'Alfombra', category: 'Salón', width: 314, depth: 184, height: 2, model: { file: 'rugRectangle', center: [0.785, 0, -0.46] } },
  { id: 'model-table', name: 'Mesa de comedor', category: 'Comedor', width: 168, depth: 89, height: 65, model: { file: 'table', center: [0.4207, 0, -0.2237] } },
  { id: 'model-tableRound', name: 'Mesa redonda', category: 'Comedor', width: 139, depth: 160, height: 73, model: { file: 'tableRound', center: [0.3464, -0.27, -0.4] } },
  { id: 'model-tableGlass', name: 'Mesa de cristal', category: 'Comedor', width: 168, depth: 89, height: 65, model: { file: 'tableGlass', center: [0.4207, 0, -0.2237] } },
  { id: 'model-chair', name: 'Silla', category: 'Comedor', width: 40, depth: 40, height: 94, model: { file: 'chair', center: [0.1, 0, -0.1] } },
  { id: 'model-chairCushion', name: 'Silla con cojín', category: 'Comedor', width: 40, depth: 40, height: 92, model: { file: 'chairCushion', center: [0.1, 0, -0.1] } },
  { id: 'model-bedDouble', name: 'Cama doble', category: 'Dormitorio', width: 191, depth: 225, height: 75, model: { file: 'bedDouble', center: [0.478, 0, -0.5625] } },
  { id: 'model-bedSingle', name: 'Cama individual', category: 'Dormitorio', width: 114, depth: 225, height: 75, model: { file: 'bedSingle', center: [0.6705, 0, -0.5625] } },
  { id: 'model-bedBunk', name: 'Litera', category: 'Dormitorio', width: 114, depth: 219, height: 170, model: { file: 'bedBunk', center: [0.2855, 0, -0.5475] } },
  { id: 'model-cabinetBedDrawer', name: 'Mesita de noche', category: 'Dormitorio', width: 53, depth: 43, height: 53, model: { file: 'cabinetBedDrawer', center: [0.123, 0, -0.0964] } },
  { id: 'model-bookcaseClosedDoors', name: 'Armario', category: 'Dormitorio', width: 80, depth: 50, height: 170, model: { file: 'bookcaseClosedDoors', center: [0.2, 0, -0.125] } },
  { id: 'model-kitchenCabinet', name: 'Mueble bajo', category: 'Cocina', width: 86, depth: 90, height: 90, model: { file: 'kitchenCabinet', center: [0.215, 0, -0.225] } },
  { id: 'model-kitchenCabinetDrawer', name: 'Mueble bajo con cajones', category: 'Cocina', width: 86, depth: 90, height: 90, model: { file: 'kitchenCabinetDrawer', center: [0.215, 0, -0.225] } },
  { id: 'model-kitchenSink', name: 'Fregadero', category: 'Cocina', width: 86, depth: 90, height: 98, model: { file: 'kitchenSink', center: [0.215, 0, -0.225] } },
  { id: 'model-kitchenStove', name: 'Cocina con horno', category: 'Cocina', width: 86, depth: 90, height: 90, model: { file: 'kitchenStove', center: [0.215, 0, -0.225] } },
  { id: 'model-kitchenFridgeLarge', name: 'Frigorífico', category: 'Cocina', width: 104, depth: 81, height: 184, model: { file: 'kitchenFridgeLarge', center: [0.26, 0, -0.1392] } },
  { id: 'model-kitchenBar', name: 'Barra', category: 'Cocina', width: 86, depth: 42, height: 84, model: { file: 'kitchenBar', center: [0.215, 0, -0.105] } },
  { id: 'model-toilet', name: 'Inodoro', category: 'Baño', width: 63, depth: 95, height: 90, model: { file: 'toilet', center: [0.1563, 0, 0.2386] } },
  { id: 'model-bathroomSink', name: 'Lavabo', category: 'Baño', width: 68, depth: 58, height: 112, model: { file: 'bathroomSink', center: [0.17, -0.4, -0.145] } },
  { id: 'model-bathtub', name: 'Bañera', category: 'Baño', width: 238, depth: 112, height: 84, model: { file: 'bathtub', center: [0.595, 0, -0.28] } },
  { id: 'model-shower', name: 'Ducha', category: 'Baño', width: 112, depth: 116, height: 219, model: { file: 'shower', center: [-0.2809, 0, -0.2709] } },
  { id: 'model-bathroomCabinet', name: 'Mueble de baño', category: 'Baño', width: 46, depth: 26, height: 78, model: { file: 'bathroomCabinet', center: [0.315, 0, -0.145] } },
  { id: 'model-desk', name: 'Escritorio', category: 'Otros', width: 147, depth: 78, height: 77, model: { file: 'desk', center: [0.3572, 0, -0.1838] } },
  { id: 'model-chairDesk', name: 'Silla de escritorio', category: 'Otros', width: 67, depth: 63, height: 122, model: { file: 'chairDesk', center: [0.1675, 0, -0.1571] } },
  { id: 'model-washer', name: 'Lavadora', category: 'Otros', width: 78, depth: 78, height: 94, model: { file: 'washer', center: [0.195, 0, -0.155] } },
  { id: 'model-washerDryerStacked', name: 'Lavadora y secadora', category: 'Otros', width: 78, depth: 78, height: 188, model: { file: 'washerDryerStacked', center: [0.195, 0, -0.155] } },
];

export const MODEL_CATALOG: CatalogItem[] = ROWS.map((row) => ({ ...row, color: MODEL_PLAN_COLOR }));
