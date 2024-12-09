document.addEventListener("DOMContentLoaded", () => {
  let n1Data, f8ToData, f8DisData, vrData, v2Data;

  async function loadData() {
    n1Data = await fetch("N1_flat.json").then((res) => res.json());
    f8ToData = await fetch("F8-TO_flat.json").then((res) => res.json()); // V1 Speeds
    f8DisData = await fetch("F8-DIS_flat.json").then((res) => res.json()); // Takeoff Distances
    vrData = await fetch("VR_flat.json").then((res) => res.json());
    v2Data = await fetch("V2_flat.json").then((res) => res.json());
  }

  const zfwSlider = document.getElementById("zfw-slider");
  const zfwInput = document.getElementById("zfw");
  const fobSlider = document.getElementById("fob-slider");
  const fobInput = document.getElementById("fob");
  const gwInput = document.getElementById("gw");
  const calculateButton = document.querySelector("button[type='submit']");
  const gwWarning = document.getElementById("gw-warning");

  const updateGW = () => {
    const zfw = parseFloat(zfwInput.value) || 0;
    const fob = parseFloat(fobInput.value) || 0;
    const gw = zfw + fob;

    if (gw > 18300 || gw < 0) {
      gwInput.value = gw > 18300 ? "OUT OF LIMIT" : "Below min!";
      calculateButton.disabled = true;
      gwWarning.style.display = "block";
    } else {
      gwInput.value = gw.toFixed(1);
      calculateButton.disabled = false;
      gwWarning.style.display = "none";
    }
  };

  zfwSlider.addEventListener("input", () => {
    zfwInput.value = zfwSlider.value;
    updateGW();
  });

  fobSlider.addEventListener("input", () => {
    fobInput.value = fobSlider.value;
    updateGW();
  });

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

  console.log("Elevation Range:", { lowerElevation, upperElevation });

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

  console.log("Interpolated Values:", { valueAtLowerElevation, valueAtUpperElevation });

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

calculateButton.addEventListener("click", (event) => {
    event.preventDefault();

    const oat = parseInt(document.getElementById("oat").value, 10);
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

    const v1 = bilinearInterpolation(f8ToData, oat, elevation); // V1 Speed (uses F8-TO_flat.json)
    const distance = bilinearInterpolation(f8DisData, oat, elevation); // Takeoff Distance (uses F8-DIS_flat.json)
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
