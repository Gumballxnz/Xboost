import express from 'express';
import CampaignService from '../../services/CampaignService.js';
import { authenticate } from '../middlewares/AuthMiddleware.js';

const router = express.Router();

// Rule 11: Standardize Routes
// GET /api/campaigns
router.get('/', authenticate, async (req, res, next) => {
    try {
        const campaigns = await CampaignService.list(req.user.id);
        res.json(campaigns);
    } catch (err) {
        next(err);
    }
});

// POST /api/campaigns
router.post('/', authenticate, async (req, res, next) => {
    try {
        const campaign = await CampaignService.create(req.user.id, req.body);
        res.status(201).json(campaign);
    } catch (err) {
        next(err);
    }
});

// GET /api/campaigns/:id
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const campaign = await CampaignService.getById(req.user.id, req.params.id);
        res.json(campaign);
    } catch (err) {
        next(err);
    }
});

export default router;
