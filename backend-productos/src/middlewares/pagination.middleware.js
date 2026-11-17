const paginate = (req, res, next) => {
  let page = parseInt(req.query.page, 10);
  let limit = parseInt(req.query.limit, 10);

  page = (!Number.isNaN(page) && page > 0) ? page : 1;
  limit = (!Number.isNaN(limit) && limit > 0 && limit <= 100) ? limit : 10;

  const offset = (page - 1) * limit;

  req.pagination = {
    page,
    limit,
    offset,
  };

  next();
};

export default paginate;
