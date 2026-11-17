const crypto = require('crypto');

const responseIntegrityHash = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (body) {
    if (body) {
      const payloadString = JSON.stringify(body);
      const hash = crypto.createHash('sha256').update(payloadString).digest('hex');

      res.setHeader('ETag', `"${hash}"`);
      res.setHeader('X-Payload-Hash', hash);

      if (req.headers['if-none-match'] === `"${hash}"`) {
        return res.status(304).end();
      }
    }
    return originalJson.call(this, body);
  };

  next();
};

module.exports = responseIntegrityHash;
