const express = require('express');
const {
  getPersons,
  getPerson,
  createPerson,
  updatePerson,
  deletePerson,
  activatePerson,
  deactivatePerson
} = require('../controllers/personController');
const { protect, authorize } = require('../middleware/auth');
const {
  validatePersonCreation,
  validatePersonUpdate,
  validateObjectId,
  validatePagination,
  handleValidationErrors
} = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// Routes
router
  .route('/')
  .get(authorize('Admin'), validatePagination, handleValidationErrors, getPersons)
  .post(authorize('Admin'), validatePersonCreation, handleValidationErrors, createPerson);

router
  .route('/:id')
  .get(validateObjectId('id'), handleValidationErrors, getPerson)
  .put(validateObjectId('id'), validatePersonUpdate, handleValidationErrors, updatePerson)
  .delete(authorize('Admin'), validateObjectId('id'), handleValidationErrors, deletePerson);

router
  .route('/:id/activate')
  .put(authorize('Admin'), validateObjectId('id'), handleValidationErrors, activatePerson);

router
  .route('/:id/deactivate')
  .put(authorize('Admin'), validateObjectId('id'), handleValidationErrors, deactivatePerson);

module.exports = router;