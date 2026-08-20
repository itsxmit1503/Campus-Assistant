import { Router, Request, Response } from 'express';
import { knowledgeService } from '../services/knowledgeService.js';

export const directoryRouter = Router();

directoryRouter.get('/university', (_req: Request, res: Response) => {
  res.json(knowledgeService.getUniversityInfo());
});

directoryRouter.get('/schools', (_req: Request, res: Response) => {
  res.json(knowledgeService.getSchools());
});

directoryRouter.get('/departments', (_req: Request, res: Response) => {
  res.json(knowledgeService.getDepartments());
});

directoryRouter.get('/departments/:id', (req: Request, res: Response): void => {
  const dept = knowledgeService.getDepartmentById(req.params.id);
  if (!dept) {
    res.status(404).json({ error: 'Department not found' });
    return;
  }
  res.json(dept);
});

directoryRouter.get('/offices', (_req: Request, res: Response) => {
  res.json(knowledgeService.getOffices());
});

directoryRouter.get('/offices/:id', (req: Request, res: Response): void => {
  const office = knowledgeService.getOfficeById(req.params.id);
  if (!office) {
    res.status(404).json({ error: 'Administrative office not found' });
    return;
  }
  res.json(office);
});

directoryRouter.get('/services', (_req: Request, res: Response) => {
  res.json(knowledgeService.getServices());
});

directoryRouter.get('/services/:id', (req: Request, res: Response): void => {
  const service = knowledgeService.getServiceById(req.params.id);
  if (!service) {
    res.status(404).json({ error: 'Student service not found' });
    return;
  }
  res.json(service);
});

directoryRouter.get('/locations', (_req: Request, res: Response) => {
  res.json(knowledgeService.getLocations());
});

directoryRouter.get('/notices', (_req: Request, res: Response) => {
  res.json(knowledgeService.getNotices());
});
