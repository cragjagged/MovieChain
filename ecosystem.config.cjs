module.exports = {
  apps: [{
    name:          'movie-chain',
    script:        'server/index.js',
    restart_delay: 2000,
    max_restarts:  10,
    watch:         false,
    env: {
      NODE_ENV: 'production',
      PORT:     '7879',
    },
  }],
};
