/**
 * PM2 na VPS: executar na raiz do clone (ex.: /var/www/atelierhub).
 * Primeira vez: pm2 start ecosystem.config.cjs && pm2 save && pm2 startup
 * Deploy CI: pm2 restart ecosystem.config.cjs --update-env
 */
const path = require("path");

module.exports = {
  apps: [
    {
      name: "atelierhub",
      cwd: __dirname,
      script: path.join(__dirname, "node_modules/next/dist/bin/next"),
      args: "start",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
