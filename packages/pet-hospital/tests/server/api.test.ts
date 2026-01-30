import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createTriageRoute } from '../../src/server/api/v1/triage';

describe('Triage API', () => {
  describe('POST /api/v1/triage/start', () => {
    it('should start triage session', async () => {
      const app = new Hono();
      app.route('/api/v1/triage', createTriageRoute());

      const response = await app.request('/api/v1/triage/start', {
        method: 'POST',
        body: JSON.stringify({
          petId: 'pet_001',
          symptoms: ['呕吐'],
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toContain('你好');
    });
  });
});
