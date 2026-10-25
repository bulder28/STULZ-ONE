import { Response } from 'express';

/**
 * ==============================================================================
 * STULZ ESPAÑA — SERVICIO SERVER-SENT EVENTS (SSE) PARA SINCRONIZACIÓN EN PLANTA
 * ==============================================================================
 * Distribución en tiempo real sin requerir brokers pesados externos (RabbitMQ/Redis).
 * Notifica a pantallas táctiles de línea (Kiosco Vue) y puestos de mando (React)
 * cada vez que se produce una asignación, cambio de puesto o fichaje.
 * ==============================================================================
 */

interface SseClient {
  id: string;
  res: Response;
  role: string;
}

class SseService {
  private clients: SseClient[] = [];

  public addClient(id: string, role: string, res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Canal SSE SGP-F Stulz Conectado', clientId: id })}\n\n`);

    this.clients.push({ id, role, res });

    res.on('close', () => {
      this.clients = this.clients.filter(c => c.id !== id);
    });
  }

  public broadcast(event: { type: string; payload: any }): void {
    const dataString = `data: ${JSON.stringify({ ...event, timestamp: new Date().toISOString() })}\n\n`;
    for (const client of this.clients) {
      try {
        client.res.write(dataString);
      } catch (e) {
        // Ignorar sockets cerrados
      }
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.length;
  }
}

export const sseService = new SseService();
