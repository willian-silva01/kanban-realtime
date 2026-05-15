// =============================================
// MÃ³dulo Activity â€” Controller
// =============================================

const asyncHandler = require('../../utils/asyncHandler');
const activityService = require('./activity.service');

/**
 * GET /api/boards/:boardId/activities
 */
const list = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const result = await activityService.listByBoard(
    req.params.boardId,
    req.user.id,
    { page, limit }
  );

  res.status(200).json({
    success: true,
    data: result.activities,
    pagination: result.pagination,
  });
});

module.exports = { list };

