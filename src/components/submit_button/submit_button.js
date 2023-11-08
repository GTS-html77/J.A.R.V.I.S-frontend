import React from 'react';
import './submit_button.css'; //import the styling for the button

function SubmitButton({ onClick }) {
    return (
      <button className="submit-button" onClick={onClick}>
        Submit
      </button>
    );
  }
  
  export default SubmitButton;
