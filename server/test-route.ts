import type { Express } from "express";

export function registerTestRoute(app: Express) {
  app.get('/api/test-simple', (req, res) => {
    res.json({ message: 'Test OK', time: new Date().toISOString() });
  });
  
  app.get('/api/admin/student-hours', (req, res) => {
    res.json({ message: 'Student hours OK', time: new Date().toISOString() });
  });
}
