echo 'export default app = ' > sampleappinit.js
mongoexport -h localhost:3001 -d readdb -c apps --jsonArray --pretty >> sampleappinit.js

echo 'export default dashboards = ' > sampledashboardsinit.js
mongoexport -h localhost:3001 -d readdb -c dashboards --jsonArray --pretty >> sampledashboardsinit.js

echo 'export default datasets = ' > sampledatasetsinit.js
mongoexport -h localhost:3001 -d readdb -c datasets --jsonArray --pretty >> sampledatasetsinit.js

echo 'export default visualizations = ' > samplevisualizationsinit.js
mongoexport -h localhost:3001 -d readdb -c visualizations --jsonArray --pretty >> samplevisualizationsinit.js
