module.exports = {
  apps: [
    {
      name: 'flag-guessr',
      cwd: __dirname,
      script: './server.mjs',
      env: {
        NODE_ENV: 'production',
        PORT: '4174',
      },
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
