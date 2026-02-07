
const express = require('express');
const router = express.Router();
const passport = require('passport');
const campaignController = require('../controllers/campaignController');

// Todas as rotas de campanha requerem autenticação
router.use(passport.authenticate('jwt', { session: false }));

router.post('/', campaignController.createCampaign);
router.get('/', campaignController.listCampaigns);

module.exports = router;
