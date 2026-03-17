// Skin AI — Local Development Wrapper
const { app } = require('./netlify/functions/api');

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Skin AI Local Preview: http://localhost:${PORT}`);
  console.log(`\n(This serves both the Website and the API)\n`);
});
