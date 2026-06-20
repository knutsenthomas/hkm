import React from 'react';
import ReactDOM from 'react-dom/client';
import ReadingPlansAdmin from '@/components/ReadingPlansAdmin';

const container = document.getElementById('reading-plans-admin-root');
if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(<ReadingPlansAdmin />);
}
