import { Hono } from 'hono';
import { TriageSkill } from '../../../skills/triage-consultation';

export function createTriageRoute() {
  const route = new Hono();
  const triageSkill = new TriageSkill();

  // Start triage session
  route.post('/start', async (c) => {
    const body = await c.req.json();
    const { petId, petType = 'dog', symptoms } = body;

    const response = await triageSkill.startTriage({
      petId,
      petType,
      userId: 'user_001', // TODO: Get from auth
    });

    return c.json(response);
  });

  // Process symptoms
  route.post('/symptoms', async (c) => {
    const body = await c.req.json();
    const { petId, symptoms } = body;

    const response = await triageSkill.processSymptom({
      petId,
      userId: 'user_001',
      symptoms,
    });

    return c.json(response);
  });

  // Generate recommendation
  route.post('/recommend', async (c) => {
    const body = await c.req.json();
    const { petId, symptoms, duration, severity } = body;

    const response = await triageSkill.generateRecommendation({
      petId,
      userId: 'user_001',
      symptoms,
      duration,
      severity,
    });

    return c.json(response);
  });

  return route;
}
