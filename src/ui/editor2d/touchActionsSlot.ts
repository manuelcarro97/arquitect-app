import { createContext } from 'react';

/**
 * Where the plan's touch buttons (Terminar, Girar, Duplicar, Borrar, medida) are shown.
 * The phone layout provides a strip below the views so they never cover the plan;
 * elsewhere (tablets) there is none and they float over the plan.
 */
export const TouchActionsSlot = createContext<HTMLElement | null>(null);
