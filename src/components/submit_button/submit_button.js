import React from 'react';
import './submit_button.css'; // Import the styling for the button

function SubmitButton({ onClick, disabled }) {
    return (
      <button className="submit-button" onClick={onClick} disabled={disabled}>
        Submit
      </button>
    );
}

export default SubmitButton;
