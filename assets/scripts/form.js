document.addEventListener("DOMContentLoaded", () => {
const zfwSlider = document.getElementById("zfw-slider");
const zfwInput = document.getElementById("zfw");
const fobSlider = document.getElementById("fob-slider");
const fobInput = document.getElementById("fob");
const gwInput = document.getElementById("gw");
const calculateButton = document.querySelector("button[type='submit']");
const gwWarning = document.getElementById("gw-warning");

// Define the min and max values for sliders
  const minZFW = 10360;
  const maxZFW = 13500;
  const minFOB = 600;
  const maxFOB = 6240;
  const maxGW = 18300;
  const minGW = 0;
  
  // Function to update the Gross Weight (GW) based on ZFW and FOB values
  const updateGW = () => {
    const zfw = parseFloat(zfwInput.value) || 0;
    const fob = parseFloat(fobInput.value) || 0;
    const gw = zfw + fob;

    if (gw > maxGW || gw < minGW) {
      calculateButton.disabled = true;
      calculateButton.style.cursor = "not-allowed";
      gwWarning.style.display = "block";
      gwWarning.textContent = gw > maxGW
        ? `Gross Weight exceeds MTOW of ${maxGW} lbs!`
        : `Gross Weight is below the minimum limit of ${minGW} lbs!`;
    } else {
      gwInput.value = gw.toFixed(0);
      calculateButton.disabled = false;
      calculateButton.style.cursor = "pointer"; // Reset to pointer or default
      gwWarning.style.display = "none";
    }
  };
  
  // Set initial values for sliders and input fields
  const setInitialValues = () => {
    zfwSlider.value = minZFW;
    zfwInput.value = minZFW;
    fobSlider.value = minFOB;
    fobInput.value = minFOB;
    updateGW(); // Make sure the GW field is updated on load
  };

  // Sync ZFW slider and input
  zfwSlider.addEventListener("input", () => {
    zfwInput.value = zfwSlider.value;
    updateGW();
  });

  zfwInput.addEventListener("input", () => {
    const value = parseFloat(zfwInput.value);
    if (value >= minZFW && value <= maxZFW) {
      zfwSlider.value = zfwInput.value;
      updateGW();
    } else {
      zfwInput.value = zfwSlider.value; // Reset to slider value if out of range
    }
  });

  // Sync FOB slider and input
  fobSlider.addEventListener("input", () => {
    fobInput.value = fobSlider.value;
    updateGW();
  });

  fobInput.addEventListener("input", () => {
    const value = parseFloat(fobInput.value);
    if (value >= minFOB && value <= maxFOB) {
      fobSlider.value = fobInput.value;
      updateGW();
    } else {
      fobInput.value = fobSlider.value; // Reset to slider value if out of range
    }
  });

// Initialize sliders and input values
  setInitialValues();

});