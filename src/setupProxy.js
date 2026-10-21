const { createProxyMiddleware } = require('http-proxy-middleware');

const target =
  process.env.REACT_APP_API_URL || 'https://laundromat-moolre-d87p.onrender.com';

const proxyOptions = {
  target,
  changeOrigin: true,
  // Don't verify the upstream TLS cert in dev. Some networks/antivirus
  // intercept HTTPS, which triggers UNABLE_TO_VERIFY_LEAF_SIGNATURE.
  secure: false,
  // Make the backend's Set-Cookie (csrf_token / session) first-party for
  // localhost so SameSite=Strict cookies are stored and sent back.
  cookieDomainRewrite: '',
};

module.exports = function (app) {
  app.use('/api', createProxyMiddleware(proxyOptions));
  app.use('/health', createProxyMiddleware(proxyOptions));
};
