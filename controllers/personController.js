const Person = require('../models/Person');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all persons (Admin only)
// @route   GET /api/persons
// @access  Private/Admin
exports.getPersons = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  
  let query = {};
  
  // Filter by role if specified
  if (req.query.role) {
    query.role = req.query.role;
  }
  
  // Filter by active status if specified
  if (req.query.active !== undefined) {
    query.isActive = req.query.active === 'true';
  }
  
  // Search by name or email
  if (req.query.search) {
    query.$or = [
      { firstName: { $regex: req.query.search, $options: 'i' } },
      { lastName: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  const total = await Person.countDocuments(query);
  const persons = await Person.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(startIndex);
  
  // Pagination result
  const pagination = {};
  
  if (startIndex + limit < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }
  
  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }
  
  res.status(200).json({
    success: true,
    count: persons.length,
    total,
    pagination,
    data: persons
  });
});

// @desc    Get single person
// @route   GET /api/persons/:id
// @access  Private/Admin or own profile
exports.getPerson = asyncHandler(async (req, res, next) => {
  const person = await Person.findById(req.params.id).select('-password');
  
  if (!person) {
    return next(new ErrorResponse('Person not found', 404));
  }
  
  // Check if user can access this profile
  if (req.user.role !== 'Admin' && req.user.id !== person.id) {
    return next(new ErrorResponse('Not authorized to access this profile', 403));
  }
  
  res.status(200).json({
    success: true,
    data: person
  });
});

// @desc    Create person (Admin only)
// @route   POST /api/persons
// @access  Private/Admin
exports.createPerson = asyncHandler(async (req, res, next) => {
  const person = await Person.create(req.body);
  
  res.status(201).json({
    success: true,
    data: person
  });
});

// @desc    Update person
// @route   PUT /api/persons/:id
// @access  Private/Admin or own profile
exports.updatePerson = asyncHandler(async (req, res, next) => {
  let person = await Person.findById(req.params.id);
  
  if (!person) {
    return next(new ErrorResponse('Person not found', 404));
  }
  
  // Check if user can update this profile
  if (req.user.role !== 'Admin' && req.user.id !== person.id) {
    return next(new ErrorResponse('Not authorized to update this profile', 403));
  }
  
  // Prevent non-admins from changing role
  if (req.user.role !== 'Admin' && req.body.role) {
    delete req.body.role;
  }
  
  // Prevent non-admins from changing active status
  if (req.user.role !== 'Admin' && req.body.isActive !== undefined) {
    delete req.body.isActive;
  }
  
  person = await Person.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).select('-password');
  
  res.status(200).json({
    success: true,
    data: person
  });
});

// @desc    Delete person (Admin only)
// @route   DELETE /api/persons/:id
// @access  Private/Admin
exports.deletePerson = asyncHandler(async (req, res, next) => {
  const person = await Person.findById(req.params.id);
  
  if (!person) {
    return next(new ErrorResponse('Person not found', 404));
  }
  
  // Prevent deletion of own account
  if (req.user.id === person.id) {
    return next(new ErrorResponse('Cannot delete your own account', 400));
  }
  
  await person.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Activate person (Admin only)
// @route   PUT /api/persons/:id/activate
// @access  Private/Admin
exports.activatePerson = asyncHandler(async (req, res, next) => {
  const person = await Person.findByIdAndUpdate(
    req.params.id,
    { isActive: true },
    { new: true, runValidators: true }
  ).select('-password');
  
  if (!person) {
    return next(new ErrorResponse('Person not found', 404));
  }
  
  res.status(200).json({
    success: true,
    data: person
  });
});

// @desc    Deactivate person (Admin only)
// @route   PUT /api/persons/:id/deactivate
// @access  Private/Admin
exports.deactivatePerson = asyncHandler(async (req, res, next) => {
  const person = await Person.findById(req.params.id);
  
  if (!person) {
    return next(new ErrorResponse('Person not found', 404));
  }
  
  // Prevent deactivation of own account
  if (req.user.id === person.id) {
    return next(new ErrorResponse('Cannot deactivate your own account', 400));
  }
  
  person.isActive = false;
  await person.save();
  
  res.status(200).json({
    success: true,
    data: person
  });
});