import React from 'react';

const LinkedInComponent: React.FC = () => {
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      padding: '10px',
      backgroundColor: '#0077b5',
      color: '#fff',
      borderRadius: '5px',
      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
      zIndex: 1000
    }}>
      <h3>Extension Activated</h3>
      <p>You are currently on LinkedIn Jobs page!</p>
    </div>
  );
};

export default LinkedInComponent; // Ensure it is default export
