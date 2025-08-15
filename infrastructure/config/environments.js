"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvironmentConfig = exports.environments = void 0;
exports.environments = {
    development: {
        region: 'us-east-1',
        environment: 'development',
        teamName: 'DevelopmentTeam',
        description: 'Hood to Coast Time Tracker - Development Environment',
        useCustomDomain: false,
        mockMode: true,
        generateEnvFile: true
    },
    production: {
        region: 'us-east-1',
        environment: 'production',
        teamName: 'ProductionTeam',
        description: 'Hood to Coast Time Tracker - Production Environment',
        useCustomDomain: false,
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
exports.getEnvironmentConfig = getEnvironmentConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZW52aXJvbm1lbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQVlhLFFBQUEsWUFBWSxHQUFzQztJQUM3RCxXQUFXLEVBQUU7UUFDWCxNQUFNLEVBQUUsV0FBVztRQUNuQixXQUFXLEVBQUUsYUFBYTtRQUMxQixRQUFRLEVBQUUsaUJBQWlCO1FBQzNCLFdBQVcsRUFBRSxzREFBc0Q7UUFDbkUsZUFBZSxFQUFFLEtBQUs7UUFDdEIsUUFBUSxFQUFFLElBQUk7UUFDZCxlQUFlLEVBQUUsSUFBSTtLQUN0QjtJQUNELFVBQVUsRUFBRTtRQUNWLE1BQU0sRUFBRSxXQUFXO1FBQ25CLFdBQVcsRUFBRSxZQUFZO1FBQ3pCLFFBQVEsRUFBRSxnQkFBZ0I7UUFDMUIsV0FBVyxFQUFFLHFEQUFxRDtRQUNsRSxlQUFlLEVBQUUsS0FBSztRQUN0QixRQUFRLEVBQUUsS0FBSztRQUNmLGVBQWUsRUFBRSxJQUFJO0tBQ3RCO0NBQ0YsQ0FBQztBQUVGLFNBQWdCLG9CQUFvQixDQUFDLEdBQVc7SUFDOUMsTUFBTSxNQUFNLEdBQUcsb0JBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqQyxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsR0FBRyx3Q0FBd0MsTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNwSDtJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUFORCxvREFNQyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBpbnRlcmZhY2UgRW52aXJvbm1lbnRDb25maWcge1xuICBkb21haW5OYW1lPzogc3RyaW5nO1xuICBzdWJkb21haW4/OiBzdHJpbmc7XG4gIHJlZ2lvbjogc3RyaW5nO1xuICBlbnZpcm9ubWVudDogc3RyaW5nO1xuICB0ZWFtTmFtZTogc3RyaW5nO1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICB1c2VDdXN0b21Eb21haW46IGJvb2xlYW47XG4gIG1vY2tNb2RlOiBib29sZWFuO1xuICBnZW5lcmF0ZUVudkZpbGU6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjb25zdCBlbnZpcm9ubWVudHM6IFJlY29yZDxzdHJpbmcsIEVudmlyb25tZW50Q29uZmlnPiA9IHtcbiAgZGV2ZWxvcG1lbnQ6IHtcbiAgICByZWdpb246ICd1cy1lYXN0LTEnLFxuICAgIGVudmlyb25tZW50OiAnZGV2ZWxvcG1lbnQnLFxuICAgIHRlYW1OYW1lOiAnRGV2ZWxvcG1lbnRUZWFtJyxcbiAgICBkZXNjcmlwdGlvbjogJ0hvb2QgdG8gQ29hc3QgVGltZSBUcmFja2VyIC0gRGV2ZWxvcG1lbnQgRW52aXJvbm1lbnQnLFxuICAgIHVzZUN1c3RvbURvbWFpbjogZmFsc2UsXG4gICAgbW9ja01vZGU6IHRydWUsXG4gICAgZ2VuZXJhdGVFbnZGaWxlOiB0cnVlXG4gIH0sXG4gIHByb2R1Y3Rpb246IHtcbiAgICByZWdpb246ICd1cy1lYXN0LTEnLFxuICAgIGVudmlyb25tZW50OiAncHJvZHVjdGlvbicsXG4gICAgdGVhbU5hbWU6ICdQcm9kdWN0aW9uVGVhbScsXG4gICAgZGVzY3JpcHRpb246ICdIb29kIHRvIENvYXN0IFRpbWUgVHJhY2tlciAtIFByb2R1Y3Rpb24gRW52aXJvbm1lbnQnLFxuICAgIHVzZUN1c3RvbURvbWFpbjogZmFsc2UsXG4gICAgbW9ja01vZGU6IGZhbHNlLFxuICAgIGdlbmVyYXRlRW52RmlsZTogdHJ1ZVxuICB9XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW52aXJvbm1lbnRDb25maWcoZW52OiBzdHJpbmcpOiBFbnZpcm9ubWVudENvbmZpZyB7XG4gIGNvbnN0IGNvbmZpZyA9IGVudmlyb25tZW50c1tlbnZdO1xuICBpZiAoIWNvbmZpZykge1xuICAgIHRocm93IG5ldyBFcnJvcihgRW52aXJvbm1lbnQgJyR7ZW52fScgbm90IGZvdW5kLiBBdmFpbGFibGUgZW52aXJvbm1lbnRzOiAke09iamVjdC5rZXlzKGVudmlyb25tZW50cykuam9pbignLCAnKX1gKTtcbiAgfVxuICByZXR1cm4gY29uZmlnO1xufVxuIl19