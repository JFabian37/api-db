const { Router } = require('express');
const { resumen } = require('../controllers/dashboardController');
const { autenticar } = require('../middleware/authMiddleware');

const router = Router();

router.get('/', autenticar(), resumen);

module.exports = router;
