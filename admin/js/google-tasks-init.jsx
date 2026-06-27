import React from 'react';
import ReactDOM from 'react-dom/client';
import GoogleTasksIntegration from '@/components/GoogleTasksIntegration';

let reactRoot = null;

window.mountGoogleTasksIntegration = function() {
    const container = document.getElementById('google-tasks-integration-card');
    if (container) {
        if (reactRoot) {
            try {
                reactRoot.unmount();
            } catch (e) {
                // Ignore safe unmount error
            }
        }
        reactRoot = ReactDOM.createRoot(container);
        reactRoot.render(<GoogleTasksIntegration />);
        console.log("[GoogleTasksInit] Google Tasks Integration mounted successfully.");
    } else {
        console.warn("[GoogleTasksInit] Mounting container #google-tasks-integration-card not found.");
    }
};
