const express = require('express');
const renderController = require('../controllers/renderController');

const router = express.Router();

router.post('/', (req, res, next) => renderController.createRender(req, res, next));
router.get('/:id', (req, res, next) => renderController.getRender(req, res, next));
router.delete('/:id', (req, res, next) => renderController.cancelRender(req, res, next));

module.exports = router;
