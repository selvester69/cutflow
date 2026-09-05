const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');

router.post('/', mediaController.upload);
router.get('/', mediaController.list);
router.get('/:id', mediaController.getById);

module.exports = router;
