import { Request, Response } from 'express';
import { localStore } from '../config/database';

export const organizacionController = {
  getLineas(req: Request, res: Response) {
    // Garantiza que Baterías no aparezca bajo ninguna circunstancia
    const lineasValidas = localStore.lineas.filter(l => !l.CodigoLinea.toUpperCase().includes('BATER'));
    return res.json(lineasValidas);
  },

  getPuestos(req: Request, res: Response) {
    return res.json(localStore.puestos);
  },

  getTurnos(req: Request, res: Response) {
    return res.json(localStore.turnos);
  }
};
