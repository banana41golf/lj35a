document.addEventListener("DOMContentLoaded", () => {
  let n1Data, f8ToData, f8DisData, vrData, v2Data, vrefData, ldaData, factData, trimData;
  let f20ToData, f20DisData, f20vrData, f20v2Data;
  let f8MTOWdata, f20MTOWdata;
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
  const maxLW = 15300;


  // Function to load the JSON data
  async function loadData() {
    n1Data = await fetch("N1_flat.json").then((res) => res.json());
    f8ToData = await fetch("F8-TO_flat.json").then((res) => res.json());
    f8DisData = await fetch("F8-DIS_flat.json").then((res) => res.json());
    vrData = await fetch("VR_flat.json").then((res) => res.json());
    v2Data = await fetch("V2_flat.json").then((res) => res.json());
    vrefData = await fetch("vref.json").then((res) => res.json());
    ldaData = await fetch("LDAA_flat.json").then((res) => res.json());
    factData = await fetch("fact.json").then((res) => res.json());
    trimData = await fetch("trim.json").then((res) => res.json());
    f20ToData = await fetch("F20-TO.json").then((res) => res.json());
    f20DisData = await fetch("F20-DIS.json").then((res) => res.json());
    f20vrData = await fetch("VR-20.json").then((res) => res.json());
    f20v2Data = await fetch("V2-20.json").then((res) => res.json());
    f8MTOWdata = await fetch("f8MTOW.json").then((res) => res.json());
    f20MTOWdata = await fetch("f20MTOW.json").then((res) => res.json());
  }

  // Function to update the Gross Weight (GW) based on ZFW and FOB values
  const updateGW = () => {
    const zfw = parseFloat(zfwInput.value) || 0;
    const fob = parseFloat(fobInput.value) || 0;
    const gw = zfw + fob;

    if (gw > maxGW || gw < minGW) {
      calculateButton.disabled = true;
      gwWarning.style.display = "block";
      gwWarning.textContent = gw > maxGW
        ? `Gross Weight exceeds MTOW of ${maxGW} lbs!`
        : `Gross Weight is below the minimum limit of ${minGW} lbs!`;
    } else {
      gwInput.value = gw.toFixed(0);
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



  // Bilinear Interpolation Logic (used for both V1 and takeoff distance)
  function bilinearInterpolation(data, targetOAT, targetElevation) {
    const elevationLevels = [...new Set(data.map((item) => item.Elevation))].sort((a, b) => a - b);

    let lowerElevation = null, upperElevation = null;

    // Adjusting elevation logic to find the closest bounds
    for (let i = 0; i < elevationLevels.length; i++) {
      if (elevationLevels[i] <= targetElevation) lowerElevation = elevationLevels[i];
      if (elevationLevels[i] >= targetElevation) {
        upperElevation = elevationLevels[i];
        break;
      }
    }

    // Adjust if the elevation falls outside known levels (like targetElevation = 15)
    if (!lowerElevation) lowerElevation = elevationLevels[0];
    if (!upperElevation) upperElevation = elevationLevels[elevationLevels.length - 1];

    const lowerData = data.filter((item) => item.Elevation === lowerElevation);
    const upperData = data.filter((item) => item.Elevation === upperElevation);

    function interpolateOAT(dataSet, oat) {
      const sortedData = dataSet.sort((a, b) => a.OAT - b.OAT);

      let lower = null, upper = null;
      for (const point of sortedData) {
        if (point.OAT <= oat) lower = point;
        if (point.OAT >= oat) {
          upper = point;
          break;
        }
      }

      if (!lower || !upper || lower.OAT === upper.OAT) {
        return lower ? lower.N1 || lower.V1 || lower.Distance : upper ? upper.N1 || upper.V1 || upper.Distance : null;
      }

      const x1 = lower.OAT, y1 = lower.N1 || lower.V1 || lower.Distance;
      const x2 = upper.OAT, y2 = upper.N1 || upper.V1 || upper.Distance;
      return y1 + ((oat - x1) * (y2 - y1)) / (x2 - x1);
    }

    const valueAtLowerElevation = interpolateOAT(lowerData, targetOAT);
    const valueAtUpperElevation = interpolateOAT(upperData, targetOAT);

    if (valueAtLowerElevation === null || valueAtUpperElevation === null) {
      return null;
    }

    const x1 = lowerElevation, y1 = valueAtLowerElevation;
    const x2 = upperElevation, y2 = valueAtUpperElevation;

    return y1 + ((targetElevation - x1) * (y2 - y1)) / (x2 - x1);
  }



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

      // Trilinear Function for V1
      function trilinearInterpolationV1(data, oat, elevation, gw) {
        const elevationLevels = [...new Set(data.map((item) => item.Elevation))].sort((a, b) => a - b);
        const gwLevels = [...new Set(data.map((item) => item.GW))].sort((a, b) => a - b);
        const oatLevels = [...new Set(data.map((item) => item.OAT))].sort((a, b) => a - b);
      
        let lowerElevation = null, upperElevation = null;
        let lowerGW = null, upperGW = null;
        let lowerOAT = null, upperOAT = null;
      
        // Elevation interpolation
        for (let i = 0; i < elevationLevels.length; i++) {
          if (elevationLevels[i] <= elevation) lowerElevation = elevationLevels[i];
          if (elevationLevels[i] >= elevation) {
            upperElevation = elevationLevels[i];
            break;
          }
        }
      
        // GW interpolation
        for (let i = 0; i < gwLevels.length; i++) {
          if (gwLevels[i] <= gw) lowerGW = gwLevels[i];
          if (gwLevels[i] >= gw) {
            upperGW = gwLevels[i];
            break;
          }
        }
      
        // OAT interpolation
        for (let i = 0; i < oatLevels.length; i++) {
          if (oatLevels[i] <= oat) lowerOAT = oatLevels[i];
          if (oatLevels[i] >= oat) {
            upperOAT = oatLevels[i];
            break;
          }
        }
      
        // Get relevant data points
        const lowerElevationData = data.filter((item) => item.Elevation === lowerElevation);
        const upperElevationData = data.filter((item) => item.Elevation === upperElevation);
        const lowerGWData = data.filter((item) => item.GW === lowerGW);
        const upperGWData = data.filter((item) => item.GW === upperGW);
        const lowerOATData = data.filter((item) => item.OAT === lowerOAT);
        const upperOATData = data.filter((item) => item.OAT === upperOAT);
      
        // Perform trilinear interpolation
        const interpolateValue = (lowerData, upperData, lowerValue, upperValue) => {
          const lower = lowerData.find((item) => item.OAT === lowerValue && item.GW === lowerGW && item.Elevation === lowerElevation);
          const upper = upperData.find((item) => item.OAT === upperValue && item.GW === upperGW && item.Elevation === upperElevation);
          if (!lower || !upper) return null;
          return lower.V1 + ((upper.V1 - lower.V1) / (upper.OAT - lower.OAT)) * (oat - lower.OAT);
        };
      
        const v1 = interpolateValue(lowerElevationData, upperElevationData, lowerOAT, upperOAT);
        return v1;
      }
  
      // Trilinear Function for TO and LDG Distance
      function trilinearInterpolationDistance(data, oat, elevation, gw) {
        const elevationLevels = [...new Set(data.map((item) => item.Elevation))].sort((a, b) => a - b);
        const gwLevels = [...new Set(data.map((item) => item.GW))].sort((a, b) => a - b);
        const oatLevels = [...new Set(data.map((item) => item.OAT))].sort((a, b) => a - b);
      
        let lowerElevation = null, upperElevation = null;
        let lowerGW = null, upperGW = null;
        let lowerOAT = null, upperOAT = null;
      
        // Elevation interpolation
        for (let i = 0; i < elevationLevels.length; i++) {
          if (elevationLevels[i] <= elevation) lowerElevation = elevationLevels[i];
          if (elevationLevels[i] >= elevation) {
            upperElevation = elevationLevels[i];
            break;
          }
        }
  
        // GW interpolation
        for (let i = 0; i < gwLevels.length; i++) {
          if (gwLevels[i] <= gw) lowerGW = gwLevels[i];
          if (gwLevels[i] >= gw) {
            upperGW = gwLevels[i];
            break;
          }
        }
      
        // OAT interpolation
        for (let i = 0; i < oatLevels.length; i++) {
          if (oatLevels[i] <= oat) lowerOAT = oatLevels[i];
          if (oatLevels[i] >= oat) {
            upperOAT = oatLevels[i];
            break;
          }
        }
      
        // Get relevant data points
        const lowerElevationData = data.filter((item) => item.Elevation === lowerElevation);
        const upperElevationData = data.filter((item) => item.Elevation === upperElevation);
        const lowerGWData = data.filter((item) => item.GW === lowerGW);
        const upperGWData = data.filter((item) => item.GW === upperGW);
        const lowerOATData = data.filter((item) => item.OAT === lowerOAT);
        const upperOATData = data.filter((item) => item.OAT === upperOAT);
  
      
      
        // Perform trilinear interpolation for takeoff distance
        const interpolateValue = (lowerData, upperData, lowerValue, upperValue) => {
          const lower = lowerData.find((item) => item.OAT === lowerValue && item.GW === lowerGW && item.Elevation === lowerElevation);
          const upper = upperData.find((item) => item.OAT === upperValue && item.GW === upperGW && item.Elevation === upperElevation);
          if (!lower || !upper) return null;
          return lower.Distance + ((upper.Distance - lower.Distance) / (upper.OAT - lower.OAT)) * (oat - lower.OAT);
        };
      
        const distance = interpolateValue(lowerElevationData, upperElevationData, lowerOAT, upperOAT);
        return distance;
      }

      //Function to remove all i elements
      function resetAllInfoIcons() {
        // Select all <i> elements within elements having the class 'info-icon'
        const allIcons = document.querySelectorAll('.info-icon i');
      
        // Loop through and remove each <i> element
        allIcons.forEach(icon => {
          icon.remove();
        });
      }
      
      
  // Calculate Button

  calculateButton.addEventListener("click", (event) => {
    event.preventDefault();
    document.getElementById("mlw-flag").innerText = " ";
    const oat = parseInt(document.getElementById("oat").value, 10);
    const gw = parseInt(gwInput.value, 10);
    const pmac = parseInt(document.getElementById("mac-input").textContent, 10);
    const flapsinput = parseInt(document.getElementById("flaps-input").value, 10);

    //Reset i elements
    // Reset all dynamically created info icons
      resetAllInfoIcons();
      console.log('Icons reset. Starting new calculation...');
    

    // Get the elevation from the #elevation span (not input)
    const elevationText = document.getElementById("elevation").value;
    const elevation = parseInt(elevationText, 10); // Convert to number

    console.log("Calculation Inputs:", { oat, elevation, gw });

    // Check if elevation is valid
    if (isNaN(elevation)) {
      console.error("Elevation is not valid:", elevation);
      alert("Elevation is not valid.");
      return;
    }
    // Check if oat is valid
    if (isNaN(oat)) {
      console.error("OAT is not valid:", oat);
      alert("OAT is not valid!");
      return;
    }



// Interpolation function for TRIM based on MAC

function interpolateTrim(mac, trimData) {
  // Sort the trimData based on MAC in ascending order (if it's not sorted)
  trimData.sort((a, b) => a.MAC - b.MAC);

  // Find the two points (below and above the input MAC value)
  let lower = null, upper = null;
  for (let i = 0; i < trimData.length; i++) {
    if (trimData[i].MAC <= mac) {
      lower = trimData[i];
    }
    if (trimData[i].MAC >= mac) {
      upper = trimData[i];
      break;
    }
  }

  // If no interpolation is needed (MAC value is exactly a data point)
  if (lower === upper) {
    return lower.TRIM;
  }

  // Linear interpolation formula
  const slope = (upper.TRIM - lower.TRIM) / (upper.MAC - lower.MAC);
  const trim = lower.TRIM + slope * (mac - lower.MAC);

  return trim;
}

// MAC and Trim Interpolation
const userMAC = parseInt(document.getElementById("mac-input").value, 10);

// Check if MAC is within limits (5-30)
if (isNaN(userMAC)) {
  console.error("MAC is not valid:", userMAC);
  alert("%MAC is not valid!");
  return;
}

console.log(`usermac = ${userMAC}`);
    // Check if MAC is valid
    if (userMAC < 5 || userMAC > 30) {
      console.error("% of MAC must be between 5.0% and 30.0%");
      alert("% of MAC must be between 5.0% and 30.0%");
      return;
    }
    

const trimResult = interpolateTrim(userMAC, trimData);
console.log("Interpolated TRIM value for MAC = " + userMAC + ": " + trimResult);

// START DYNAMIC MTOW FUNCTION
  function interpolateMTOW(data, targetOAT, targetElevation) {
  console.log("Full Dataset:", data);
  console.log("Target OAT:", targetOAT, "Target Elevation:", targetElevation);

  if (!Array.isArray(data) || data.length === 0) {
      console.error("Invalid or empty data passed to interpolateMTOW.");
      return NaN;
  }

  // Step 1: Identify the maximum and minimum OAT values in the dataset
  const oatLevels = [...new Set(data.map((item) => item.OAT))].sort((a, b) => a - b);
  const maxOAT = Math.max(...oatLevels);
  const minOAT = Math.min(...oatLevels);

  // Cap targetOAT to the dataset range
  if (targetOAT > maxOAT) {
      console.warn(`Target OAT (${targetOAT}°C) exceeds dataset range. Capping to maximum OAT (${maxOAT}°C).`);
      targetOAT = maxOAT;
  } else if (targetOAT < minOAT) {
      console.warn(`Target OAT (${targetOAT}°C) below dataset range. Capping to minimum OAT (${minOAT}°C).`);
      targetOAT = minOAT;
  }

  // Step 2: Find the nearest OAT bounds for interpolation
  let lowerOAT = null, upperOAT = null;
  for (let i = 0; i < oatLevels.length; i++) {
      if (oatLevels[i] <= targetOAT) lowerOAT = oatLevels[i];
      if (oatLevels[i] >= targetOAT) {
          upperOAT = oatLevels[i];
          break;
      }
  }
  console.log("OAT Bounds for Interpolation:", lowerOAT, upperOAT);

  if (lowerOAT === upperOAT) {
      // Exact OAT match; filter data for this OAT
      const validData = data.filter((item) => item.OAT === lowerOAT);
      console.log("Valid Data (Exact OAT Match):", validData);
      return interpolateElevation(validData, targetElevation);
  }

  // Step 3: Interpolate MTOW for target OAT at each elevation
  const lowerOATData = data.filter((item) => item.OAT === lowerOAT);
  const upperOATData = data.filter((item) => item.OAT === upperOAT);
  console.log("Lower OAT Data:", lowerOATData);
  console.log("Upper OAT Data:", upperOATData);

  if (lowerOATData.length === 0 || upperOATData.length === 0) {
      console.warn("Missing data for OAT interpolation. Returning NaN.");
      return NaN;
  }

  const interpolatedOATData = [];
  const elevationLevels = [...new Set(lowerOATData.map((item) => item.elevation))];
  elevationLevels.forEach((elevation) => {
      const lowerPoint = lowerOATData.find((item) => item.elevation === elevation);
      const upperPoint = upperOATData.find((item) => item.elevation === elevation);
      if (lowerPoint && upperPoint) {
          const interpolatedMTOW = lowerPoint.MTOW + 
              ((targetOAT - lowerOAT) * (upperPoint.MTOW - lowerPoint.MTOW)) / 
              (upperOAT - lowerOAT);
          interpolatedOATData.push({ elevation, OAT: targetOAT, MTOW: interpolatedMTOW });
      }
  });
  console.log("Interpolated Data for Target OAT:", interpolatedOATData);

  // Step 4: Interpolate MTOW for target elevation
  return interpolateElevation(interpolatedOATData, targetElevation);
  }

  function interpolateElevation(data, targetElevation) {
  console.log("Data for Elevation Interpolation:", data);

  // Find the maximum elevation
  const elevations = [...new Set(data.map((item) => item.elevation))].sort((a, b) => a - b);
  const maxElevation = Math.max(...elevations);

  // Cap elevation if it exceeds the maximum
  if (targetElevation > maxElevation) {
      console.warn(
          `Target Elevation (${targetElevation} ft) exceeds maximum valid elevation (${maxElevation} ft).`
      );
      const cappedData = data.filter((item) => item.elevation === maxElevation);
      return cappedData[0]?.MTOW || NaN;
  }

  // Find elevation bounds
  let lowerElevation = null, upperElevation = null;
  for (let i = 0; i < elevations.length; i++) {
      if (elevations[i] <= targetElevation) lowerElevation = elevations[i];
      if (elevations[i] >= targetElevation) {
          upperElevation = elevations[i];
          break;
      }
  }
  console.log("Elevation Bounds for Interpolation:", lowerElevation, upperElevation);

  if (lowerElevation === upperElevation) {
      // Exact match for elevation
      const exactMatch = data.find((item) => item.elevation === lowerElevation);
      return exactMatch?.MTOW || NaN;
  }

  // Interpolate between elevation bounds
  const lowerPoint = data.find((item) => item.elevation === lowerElevation);
  const upperPoint = data.find((item) => item.elevation === upperElevation);

  if (!lowerPoint || !upperPoint) {
      console.warn("Missing data for elevation interpolation. Returning NaN.");
      return NaN;
  }

  const e1 = lowerPoint.elevation, m1 = lowerPoint.MTOW;
  const e2 = upperPoint.elevation, m2 = upperPoint.MTOW;

  return m1 + ((targetElevation - e1) * (m2 - m1)) / (e2 - e1);
  }
// END MTOW INTERPOLATION FUNCTION

// Update Info Icon to Exclaim Icon Function
function updateOrInsertInfoIcon(elementId, newTooltip, newIconClass, newIconColor) {
  // Select the info-icon element by its ID
  const infoIconElement = document.getElementById(elementId);

  if (infoIconElement) {
    // Update the data-tooltip attribute
    infoIconElement.setAttribute('data-tooltip', newTooltip);

    // Check if an <i> element already exists
    let iconElement = infoIconElement.querySelector('i');

    if (!iconElement) {
      // Create a new <i> element if it doesn't exist
      iconElement = document.createElement('i');
      infoIconElement.appendChild(iconElement); // Append the new icon
    }

    // Update the class of the <i> element
    iconElement.className = newIconClass;

    // Update the color of the icon
    iconElement.style.color = newIconColor;
  }
}



// Calculations Here

let v1, distance, vr, v2;

// Check if Flaps 8 or 20 and pull data set accordingly
if (flapsinput === 8) {
    v1 = trilinearInterpolationV1(f8ToData, oat, elevation, gw);
    distance = trilinearInterpolationDistance(f8DisData, oat, elevation, gw);
    vr = interpolateByGW(vrData, gw, "VR");
    v2 = interpolateByGW(v2Data, gw, "V2");
    rtow = interpolateMTOW(f8MTOWdata, oat, elevation);
    console.log(`RTOW for Flaps ${flapsinput} = ${rtow}`);
} else {
    v1 = trilinearInterpolationV1(f20ToData, oat, elevation, gw);
    distance = trilinearInterpolationDistance(f20DisData, oat, elevation, gw);
    vr = interpolateByGW(f20vrData, gw, "VR");
    v2 = interpolateByGW(f20v2Data, gw, "V2");
    rtow = interpolateMTOW(f20MTOWdata, oat, elevation);
    console.log(`RTOW for Flaps ${flapsinput} = ${rtow}`);
}


// Calculations for N1, VREF, LDR and TRIM
    const n1 = bilinearInterpolation(n1Data, oat, elevation);
    const vref = interpolateByGW(vrefData, gw, "VREF");
    const ldaa = trilinearInterpolationDistance(ldaData, oat, elevation, gw);
    const fact = trilinearInterpolationDistance(factData, oat, elevation, gw);
    const trim = interpolateByGW(trimData, pmac, "TRIM");

// Check if MLW exceeds GW and insert flag if true
if(gw > maxLW) {
  updateOrInsertInfoIcon(
    'mlw-icon', 
    'Warning: GW exceeds the current MLW limit.', 
    'fa-solid fa-triangle-exclamation',
    'orange'
  );
}

// Check if GW exceeds calculated RTOW and update flag
if(gw > rtow){
  updateOrInsertInfoIcon(
  'rtow-icon', 
  'Warning: GW exceeds the current RTOW limit.', 
  'fa-solid fa-triangle-exclamation',
  'orange'
);
}

// Update RTOW form
    document.getElementById("rtow-input").innerText = rtow ? `${Math.round(rtow)} lbs` : "N/A";
//Update HTML forms
    document.getElementById("n1-output").innerText = n1 ? n1.toFixed(1) : "N/A";
    document.getElementById("distance-output").innerText = distance ? `${Math.round(distance)} ft` : "N/A";
    document.getElementById("v1-output").innerText = v1 ? `${Math.round(v1)} knots` : "N/A";
    document.getElementById("vr-output").innerText = vr ? `${Math.round(vr)} knots` : "N/A";
    document.getElementById("v2-output").innerText = v2 ? `${Math.round(v2)} knots` : "N/A";
    document.getElementById("vref-output").innerText = vref ? `${Math.round(vref)} knots` : "N/A";
    document.getElementById("ldaa-output").innerText = ldaa ? `${Math.round(ldaa)} feet` : "N/A";
    document.getElementById("fact-output").innerText = fact ? `${Math.round(fact)} feet` : "N/A";
    document.getElementById("trim-output").innerText = trimResult ? trimResult.toFixed(1) : "N/A";
// Calculate and populate Vapp (Vref + Gust Factor)
    const gustFactor = parseInt(document.getElementById("gust-factor").value);
    const vapp = gustFactor + vref
    document.getElementById("vapp-output").innerText = vapp ? `${Math.round(vapp)} knots` : "N/A";

});

loadData();
});
