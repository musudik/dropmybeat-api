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
const { protect, adminOnly } = require('../middleware/auth');
const {
  validatePersonCreation,
  validatePersonUpdate,
  validateObjectId,
  validatePagination,
  handleValidationErrors
} = require('../middleware/validation');

const router = express.Router();

// All routes are protected and Admin-only for manager operations
router.use(protect);

// Routes - Admin only for all manager operations
router
  .route('/')
  .get(adminOnly, validatePagination, handleValidationErrors, getPersons)
  .post(adminOnly, validatePersonCreation, handleValidationErrors, createPerson);

router
  .route('/:id')
  .get(validateObjectId('id'), handleValidationErrors, getPerson) // Users can view their own profile
  .put(validateObjectId('id'), validatePersonUpdate, handleValidationErrors, updatePerson) // Users can update their own profile
  .delete(adminOnly, validateObjectId('id'), handleValidationErrors, deletePerson);

router
  .route('/:id/activate')
  .put(adminOnly, validateObjectId('id'), handleValidationErrors, activatePerson);

router
  .route('/:id/deactivate')
  .put(adminOnly, validateObjectId('id'), handleValidationErrors, deactivatePerson);

module.exports = router;