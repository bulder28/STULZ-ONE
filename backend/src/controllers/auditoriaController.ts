import { Request, Response } from 'express';
import { localStore } from '../config/database';

export const auditoriaController = {
  getAuditoriaLog(req: Request, res: Response) {
    const { modulo, limite } = req.query;
    let log = [...localStore.auditoria].reverse();

    if (modulo) {
      log = log.filter(a => a.Modulo.toUpperCase() === (modulo as string).toUpperCase());
    }

    const limitNum = limite ? parseInt(limite as string, 10) : 100;
    return res.json(log.slice(0, limitNum));
  }
};
