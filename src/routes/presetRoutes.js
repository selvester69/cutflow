const express = require('express');
const presetController = require('../controllers/presetController');

const router = express.Router();

router.get('/', (req, res, next) => presetController.getPresets(req, res, next));

module.exports = router;
