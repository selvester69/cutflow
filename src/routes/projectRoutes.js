const express = require('express');
const projectController = require('../controllers/projectController');

const router = express.Router();

router.get('/:id', (req, res, next) => projectController.getProject(req, res, next));
router.put('/:id', (req, res, next) => projectController.saveProject(req, res, next));

module.exports = router;
