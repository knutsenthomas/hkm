import React from 'react';
import ReactDOM from 'react-dom/client';
import TodoApp from '@/components/TodoApp';

const container = document.getElementById('todo-app-root');
if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(<TodoApp />);
}
