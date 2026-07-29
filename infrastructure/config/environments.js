"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.environments = void 0;
exports.getEnvironmentConfig = getEnvironmentConfig;
exports.environments = {
    development: {
        region: 'us-east-1',
        environment: 'development',
        description: 'Hood to Coast Time Tracker - Development Environment',
        mockMode: true,
        generateEnvFile: true
    },
    production: {
        region: 'us-east-1',
        environment: 'production',
        description: 'Hood to Coast Time Tracker - Production Environment',
        mockMode: false,
        generateEnvFile: true
    }
};
function getEnvironmentConfig(env) {
    const config = exports.environments[env];
    if (!config) {
        throw new Error(`Environment '${env}' not found. Available environments: ${Object.keys(exports.environments).join(', ')}`);
    }
    return config;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZW52aXJvbm1lbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQXlCQSxvREFNQztBQXZCWSxRQUFBLFlBQVksR0FBc0M7SUFDN0QsV0FBVyxFQUFFO1FBQ1gsTUFBTSxFQUFFLFdBQVc7UUFDbkIsV0FBVyxFQUFFLGFBQWE7UUFDMUIsV0FBVyxFQUFFLHNEQUFzRDtRQUNuRSxRQUFRLEVBQUUsSUFBSTtRQUNkLGVBQWUsRUFBRSxJQUFJO0tBQ3RCO0lBQ0QsVUFBVSxFQUFFO1FBQ1YsTUFBTSxFQUFFLFdBQVc7UUFDbkIsV0FBVyxFQUFFLFlBQVk7UUFDekIsV0FBVyxFQUFFLHFEQUFxRDtRQUNsRSxRQUFRLEVBQUUsS0FBSztRQUNmLGVBQWUsRUFBRSxJQUFJO0tBQ3RCO0NBQ0YsQ0FBQztBQUVGLFNBQWdCLG9CQUFvQixDQUFDLEdBQVc7SUFDOUMsTUFBTSxNQUFNLEdBQUcsb0JBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDWixNQUFNLElBQUksS0FBSyxDQUFDLGdCQUFnQixHQUFHLHdDQUF3QyxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3JILENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGludGVyZmFjZSBFbnZpcm9ubWVudENvbmZpZyB7XG4gIHJlZ2lvbjogc3RyaW5nO1xuICBlbnZpcm9ubWVudDogc3RyaW5nO1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICBtb2NrTW9kZTogYm9vbGVhbjtcbiAgZ2VuZXJhdGVFbnZGaWxlOiBib29sZWFuO1xufVxuXG5leHBvcnQgY29uc3QgZW52aXJvbm1lbnRzOiBSZWNvcmQ8c3RyaW5nLCBFbnZpcm9ubWVudENvbmZpZz4gPSB7XG4gIGRldmVsb3BtZW50OiB7XG4gICAgcmVnaW9uOiAndXMtZWFzdC0xJyxcbiAgICBlbnZpcm9ubWVudDogJ2RldmVsb3BtZW50JyxcbiAgICBkZXNjcmlwdGlvbjogJ0hvb2QgdG8gQ29hc3QgVGltZSBUcmFja2VyIC0gRGV2ZWxvcG1lbnQgRW52aXJvbm1lbnQnLFxuICAgIG1vY2tNb2RlOiB0cnVlLFxuICAgIGdlbmVyYXRlRW52RmlsZTogdHJ1ZVxuICB9LFxuICBwcm9kdWN0aW9uOiB7XG4gICAgcmVnaW9uOiAndXMtZWFzdC0xJyxcbiAgICBlbnZpcm9ubWVudDogJ3Byb2R1Y3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnSG9vZCB0byBDb2FzdCBUaW1lIFRyYWNrZXIgLSBQcm9kdWN0aW9uIEVudmlyb25tZW50JyxcbiAgICBtb2NrTW9kZTogZmFsc2UsXG4gICAgZ2VuZXJhdGVFbnZGaWxlOiB0cnVlXG4gIH1cbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnZpcm9ubWVudENvbmZpZyhlbnY6IHN0cmluZyk6IEVudmlyb25tZW50Q29uZmlnIHtcbiAgY29uc3QgY29uZmlnID0gZW52aXJvbm1lbnRzW2Vudl07XG4gIGlmICghY29uZmlnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBFbnZpcm9ubWVudCAnJHtlbnZ9JyBub3QgZm91bmQuIEF2YWlsYWJsZSBlbnZpcm9ubWVudHM6ICR7T2JqZWN0LmtleXMoZW52aXJvbm1lbnRzKS5qb2luKCcsICcpfWApO1xuICB9XG4gIHJldHVybiBjb25maWc7XG59XG4iXX0=