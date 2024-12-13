document.addEventListener("DOMContentLoaded", () => {
  let n1Data, f8ToData, f8DisData, vrData, v2Data, vrefData, ldaData, factData, trimData;
  
  // Cache DOM elements
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

  // Function to load all data files in parallel
  async function loadData() {
    const dataFiles = [
      "N1_flat.json",
      "F8-TO_flat.json",
      "F8-DIS_flat.json",
      "VR_flat.json",
      "V2_flat.json",
      "vref.json",
      "LDAA_flat.json",
      "fact.json",
      "trim.json"
    ];
    [n1Data, f8ToData, f8DisData, vrData, v2Data, vrefData, ldaData, factData, trimData] = await Promise.all(
      dataFiles.map(file => fetch(file).then(res => res.json()))
    );
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

  // Function to update sliders and inputs
  const updateSliderInput = (slider, input, minValue, maxValue) => {
    slider.addEventListener("input", () => {
      input.value = slider.value;
      updateGW();
    });
    input.addEventListener("input", () => {
      const value = parseFloat(input.value);
      if (value >= minValue && value <= maxValue) {
        slider.value = input.value;
        updateGW();
      } else {
        input.value = slider.value; // Reset to slider value if out of range
      }
    });
  };

  // Set initial values for sliders and input fields
  const setInitialValues = () => {
    zfwSlider.value = minZFW;
    zfwInput.value = minZFW;
    fobSlider.value = minFOB;
    fobInput.value = minFOB;
    updateGW(); // Make sure the GW field is updated on load
  };

  // Apply slider-input synchronization
  updateSliderInput(zfwSlider, zfwInput, minZFW, maxZFW);
  updateSliderInput(fobSlider, fobInput, minFOB, maxFOB);

  // Bilinear Interpolation Logic (used for both V1 and takeoff distance)
  function bilinearInterpolation(data, targetOAT, targetElevation) {
    const elevationLevels = [...new Set(data.map((item) => item.Elevation))].sort((a, b) => a - b);
    let lowerElevation = null, upperElevation = null;

    for (let i = 0; i < elevationLevels.length; i++) {
      if (elevationLevels[i] <= targetElevation) lowerElevation = elevationLevels[i];
      if (elevationLevels[i] >= targetElevation) {
        upperElevation = elevationLevels[i];
        break;
      }
    }

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

  // Interpolate by Gross Weight (GW)
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

  // Trilinear Interpolation for V1
  function trilinearInterpolationV1(data, oat, elevation, gw) {
    const elevationLevels = [...new Set(data.map((item) => item.Elevation))].sort((a, b) => a - b);
    const gwLevels = [...new Set(data.map((item) => item.GW))].sort((a, b) => a - b);
    const oatLevels = [...new Set(data.map((item) => item.OAT))].sort((a, b) => a - b);

    let lowerElevation = null, upperElevation = null;
    let lowerGW = null, upperGW = null;
    let lowerOAT = null, upperOAT = null;

    for (let i = 0; i < elevationLevels.length; i++) {
      if (elevationLevels[i] <= elevation) lowerElevation = elevationLevels[i];
      if (elevationLevels[i] >= elevation) {
        upperElevation = elevationLevels[i];
        break;
      }
    }

    for (let i = 0; i < gwLevels.length; i++) {
      if (gwLevels[i] <= gw) lowerGW = gwLevels[i];
      if (gwLevels[i] >= gw) {
        upperGW = gwLevels[i];
        break;
      }
    }

    for (let i = 0; i < oatLevels.length; i++) {
      if (oatLevels[i] <= oat) lowerOAT = oatLevels[i];
      if (oatLevels[i] >= oat) {
        upperOAT = oatLevels[i];
        break;
      }
    }

    const lowerElevationData = data.filter((item) => item.Elevation === lowerElevation);
    const upperElevationData = data.filter((item) => item.Elevation === upperElevation);
    const lowerGWData = data.filter((item) => item.GW === lowerGW);
    const upperGWData = data.filter((item) => item.GW === upperGW);
    const lowerOATData = data.filter((item) => item.OAT === lowerOAT);
    const upperOATData = data.filter((item) => item.OAT === upperOAT);

    const interpolateValue = (lowerData, upperData, lowerValue, upperValue) => {
      const lower = lowerData.find((item) => item.OAT === lowerValue && item.GW === lowerGW && item.Elevation === lowerElevation);
      const upper = upperData.find((item) => item.OAT === upperValue && item.GW === upperGW && item.Elevation === upperElevation);
      if (!lower || !upper) return null;
      return lower.V1 + ((upper.V1 - lower.V1) / (upper.OAT - lower.OAT)) * (oat - lower.OAT);
    };

    const v1 = interpolateValue(lowerElevationData, upperElevationData, lowerOAT, upperOAT);
    return v1;
  }

  // Trilinear Interpolation for Distance
  function trilinearInterpolationDistance(data, oat, elevation, gw) {
    const elevationLevels = [...new Set(data.map((item) => item.Elevation))].sort((a, b) => a - b);
    const gwLevels = [...new Set(data.map((item) => item.GW))].sort((a, b) => a - b);
    const oatLevels = [...new Set(data.map((item) => item.OAT))].sort((a, b) => a - b);

    let lowerElevation = null, upperElevation = null;
    let lowerGW = null, upperGW = null;
    let lowerOAT = null, upperOAT = null;

    for (let i = 0; i < elevationLevels.length; i++) {
      if (elevationLevels[i] <= elevation) lowerElevation = elevationLevels[i];
      if (elevationLevels[i] >= elevation) {
        upperElevation = elevationLevels[i];
        break;
      }
    }

    for (let i = 0; i < gwLevels.length; i++) {
      if (gwLevels[i] <= gw) lowerGW = gwLevels[i];
      if (gwLevels[i] >= gw) {
        upperGW = gwLevels[i];
        break;
      }
    }

    for (let i = 0; i < oatLevels.length; i++) {
      if (oatLevels[i] <= oat) lowerOAT = oatLevels[i];
      if (oatLevels[i] >= oat) {
        upperOAT = oatLevels[i];
        break;
      }
    }

    const lowerElevationData = data.filter((item) => item.Elevation === lowerElevation);
    const upperElevationData = data.filter((item) => item.Elevation === upperElevation);
    const lowerGWData = data.filter((item) => item.GW === lowerGW);
    const upperGWData = data.filter((item) => item.GW === upperGW);
    const lowerOATData = data.filter((item) => item.OAT === lowerOAT);
    const upperOATData = data.filter((item) => item.OAT === upperOAT);

    const interpolateValue = (lowerData, upperData, lowerValue, upperValue) => {
      const lower = lowerData.find((item) => item.OAT === lowerValue && item.GW === lowerGW && item.Elevation === lowerElevation);
      const upper = upperData.find((item) => item.OAT === upperValue && item.GW === upperGW && item.Elevation === upperElevation);
      if (!lower || !upper) return null;
      return lower.Distance + ((upper.Distance - lower.Distance) / (upper.OAT - lower.OAT)) * (oat - lower.OAT);
    };

    const distance = interpolateValue(lowerElevationData, upperElevationData, lowerOAT, upperOAT);
    return distance;
  }

  // Calculate Button
  calculateButton.addEventListener("click", (event) => {
    event.preventDefault();
    document.getElementById("mlw-flag").innerText = " ";
    const oat = parseInt(document.getElementById("oat").textContent, 10);
    const gw = parseInt(gwInput.value, 10);
    const pmac = parseInt(document.getElementById("mac-input").textContent, 10);

    const elevationText = document.getElementById("elevation").textContent;
    const elevation = parseInt(elevationText, 10); 

    if (isNaN(elevation)) {
      console.error("Elevation is not valid:", elevation);
      return;
    }

    // Interpolation calculations
    const v1 = trilinearInterpolationV1(f8ToData, oat, elevation, gw);
    const distance = trilinearInterpolationDistance(f8DisData, oat, elevation, gw);
    const n1 = bilinearInterpolation(n1Data, oat, elevation);
    const vr = interpolateByGW(vrData, gw, "VR");
    const v2 = interpolateByGW(v2Data, gw, "V2");
    const vref = interpolateByGW(vrefData, gw, "VREF");
    const ldaa = trilinearInterpolationDistance(ldaData, oat, elevation, gw);
    const fact = trilinearInterpolationDistance(factData, oat, elevation, gw);
    const trim = interpolateByGW(trimData, pmac, "TRIM");

    if (gw > 15300) {
      console.log("MLW EXCEEDED");
      document.getElementById("mlw-flag").innerText = "MLW EXCEEDED";
    }

    // Update HTML forms
    document.getElementById("n1-output").innerText = n1 ? n1.toFixed(1) : "N/A";
    document.getElementById("distance-output").innerText = distance ? `${Math.round(distance)} ft` : "N/A";
    document.getElementById("v1-output").innerText = v1 ? `${Math.round(v1)} knots` : "N/A";
    document.getElementById("vr-output").innerText = vr ? `${Math.round(vr)} knots` : "N/A";
    document.getElementById("v2-output").innerText = v2 ? `${Math.round(v2)} knots` : "N/A";
    document.getElementById("vref-output").innerText = vref ? `${Math.round(vref)} knots` : "N/A";
    document.getElementById("ldaa-output").innerText = ldaa ? `${Math.round(ldaa)} feet` : "N/A";
    document.getElementById("fact-output").innerText = fact ? `${Math.round(fact)} feet` : "N/A";
    document.getElementById("trim-output").innerText = trim ? trim.toFixed(1) : "N/A";
    
    const gustFactor = parseInt(document.getElementById("gust-factor").value);
    const vapp = gustFactor + vref;
    document.getElementById("vapp-output").innerText = vapp ? `${Math.round(vapp)} knots` : "N/A";
  });

  // Load the data
  loadData();
});
