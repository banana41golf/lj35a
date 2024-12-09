document.addEventListener("DOMContentLoaded", () => {
  let n1Data, f8ToData, f8DisData, vrData, v2Data;
  const zfwSlider = document.getElementById("zfw-slider");
  const zfwInput = document.getElementById("zfw");
  const fobSlider = document.getElementById("fob-slider");
  const fobInput = document.getElementById("fob");
  const gwInput = document.getElementById("gw");
  const calculateButton = document.querySelector("button[type='submit']");
  const gwWarning = document.getElementById("gw-warning");

  // Define the min and max values for sliders
  const minZFW = 10360;
  const maxZFW = 18300;
  const minFOB = 0;
  const maxFOB = 6240;
  const maxGW = 18300;
  const minGW = 0;

  // Function to load the JSON data - includes N1, Takeoff Dist, V1, VR, V2
  async function loadData() {
    n1Data = await fetch("N1_flat.json").then((res) => res.json());
    f8ToData = await fetch("F8-TO_flat.json").then((res) => res.json());
    f8DisData = await fetch("F8-DIS_flat.json").then((res) => res.json());
    vrData = await fetch("VR_flat.json").then((res) => res.json());
    v2Data = await fetch("V2_flat.json").then((res) => res.json());
  }

  // Function to update the Gross Weight (GW) based on ZFW and FOB values
  const updateGW = () => {
    const zfw = parseFloat(zfwInput.value) || 0;
    const fob = parseFloat(fobInput.value) || 0;
    const gw = zfw + fob;

    if (gw > maxGW || gw < minGW) {
      gwInput.value = gw > maxGW ? `MTOW EXCEEDED` : `Below min (${minGW})!`;
      calculateButton.disabled = true;
      gwWarning.style.display = "block";
      gwWarning.textContent = gw > maxGW
        ? `Gross Weight exceeds MTOW of ${maxGW} lbs!`
        : `Gross Weight is below the minimum limit of ${minGW} lbs!`;
    } else {
      gwInput.value = gw.toFixed(1);
      calculateButton.disabled = false;
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

  function trilinearInterpolation(data, targetOAT, targetElevation, targetGW) {
    const elevationLevels = [...new Set(data.map((item) => item.Elevation))].sort((a, b) => a - b);
    const gwLevels = [...new Set(data.map((item) => item.GW))].sort((a, b) => a - b);
    const oatLevels = [...new Set(data.map((item) => item.OAT))].sort((a, b) => a - b);
  
    let lowerElevation = null, upperElevation = null;
    let lowerGW = null, upperGW = null;
    let lowerOAT = null, upperOAT = null;
  
    // Find closest bounds for each dimension (Elevation, GW, OAT)
    for (let i = 0; i < elevationLevels.length; i++) {
      if (elevationLevels[i] <= targetElevation) lowerElevation = elevationLevels[i];
      if (elevationLevels[i] >= targetElevation) {
        upperElevation = elevationLevels[i];
        break;
      }
    }
  
    for (let i = 0; i < gwLevels.length; i++) {
      if (gwLevels[i] <= targetGW) lowerGW = gwLevels[i];
      if (gwLevels[i] >= targetGW) {
        upperGW = gwLevels[i];
        break;
      }
    }
  
    for (let i = 0; i < oatLevels.length; i++) {
      if (oatLevels[i] <= targetOAT) lowerOAT = oatLevels[i];
      if (oatLevels[i] >= targetOAT) {
        upperOAT = oatLevels[i];
        break;
      }
    }
  
    // Find the lower and upper data points for interpolation
    const lowerData = data.filter((item) => item.Elevation === lowerElevation && item.GW === lowerGW && item.OAT === lowerOAT);
    const upperData = data.filter((item) => item.Elevation === upperElevation && item.GW === upperGW && item.OAT === upperOAT);
  
    // Interpolation logic between the points
    function interpolate(dataSet, oat, elevation, gw) {
      const sortedData = dataSet.sort((a, b) => a.OAT - b.OAT);
      let lower = null, upper = null;
      for (const point of sortedData) {
        if (point.OAT <= oat) lower = point;
        if (point.OAT >= oat) {
          upper = point;
          break;
        }
      }
  
      const x1 = lower ? lower.OAT : 0, y1 = lower ? lower.N1 || lower.V1 || lower.Distance : 0;
      const x2 = upper ? upper.OAT : 0, y2 = upper ? upper.N1 || upper.V1 || upper.Distance : 0;
      return y1 + ((oat - x1) * (y2 - y1)) / (x2 - x1);
    }
  
    const valueAtLower = interpolate(lowerData, targetOAT, targetElevation, targetGW);
    const valueAtUpper = interpolate(upperData, targetOAT, targetElevation, targetGW);
  
    // Final interpolation based on all 3 dimensions
    const x1 = lowerElevation, y1 = valueAtLower;
    const x2 = upperElevation, y2 = valueAtUpper;
    return y1 + ((targetElevation - x1) * (y2 - y1)) / (x2 - x1);
  }
  

  // Interpolate by GW used by VR and V2
  function interpolateByGW(data, targetGW, key) {
    const sortedData = data.sort((a, b) => a.GW - b.GW);

    let lower = null, upper = null;
    for (const point of sortedData) {
      if (point.GW <= targetGW) lower = point;
      if (point.GW >= targetGW) {
        upper = point;
        break;
      }
    }

    if (!lower || !upper || lower.GW === upper.GW) {
      return lower ? lower[key] : upper ? upper[key] : null;
    }

    const x1 = lower.GW, y1 = lower[key];
    const x2 = upper.GW, y2 = upper[key];
    return y1 + ((targetGW - x1) * (y2 - y1)) / (x2 - x1);
  }

// Calculate Button
calculateButton.addEventListener("click", (event) => {
  event.preventDefault();

  const oat = parseInt(document.getElementById("oat").textContent, 10);
  const gw = parseInt(gwInput.value, 10);

  // Get the elevation from the #elevation span (not input)
  const elevationText = document.getElementById("elevation").textContent;
  const elevation = parseInt(elevationText, 10); // Convert to number

  console.log("V1 Calculation Inputs:", { oat, elevation, gw });

  // Check if elevation is valid
  if (isNaN(elevation)) {
    console.error("Elevation is not valid:", elevation);
    return;
  }

  // Trilinear Interpolation for V1 Speed (uses F8-TO_flat.json) and Takeoff Distance (uses F8-DIS_flat.json)
  const v1 = trilinearInterpolation(f8ToData, oat, elevation, gw); // V1 Speed
  const distance = trilinearInterpolation(f8DisData, oat, elevation, gw); // Takeoff Distance
  const n1 = bilinearInterpolation(n1Data, oat, elevation); // N1
  const vr = interpolateByGW(vrData, gw, "VR");
  const v2 = interpolateByGW(v2Data, gw, "V2");

  console.log("V1 Speed:", v1);

  document.getElementById("n1-output").innerText = n1 ? n1.toFixed(2) : "N/A";
  document.getElementById("distance-output").innerText = distance ? `${Math.round(distance)} ft` : "N/A";
  document.getElementById("v1-output").innerText = v1 ? `${Math.round(v1)} knots` : "N/A";
  document.getElementById("vr-output").innerText = vr ? `${Math.round(vr)} knots` : "N/A";
  document.getElementById("v2-output").innerText = v2 ? `${Math.round(v2)} knots` : "N/A";
});


  loadData();
});
