// Revert N1 Calculation to Bilinear Interpolation
function bilinearInterpolationN1(data, targetOAT, targetElevation) {
  console.log(`Starting Bilinear Interpolation for N1 with OAT: ${targetOAT}, Elevation: ${targetElevation}`);
  
  // Get sorted elevation and temperature levels
  const elevationLevels = [...new Set(data.map(item => item.Elevation))].sort((a, b) => a - b);
  const oatLevels = [...new Set(data.map(item => item.OAT))].sort((a, b) => a - b);

  // Find lower and upper bounds for elevation
  let lowerElevation, upperElevation;
  for (const elevation of elevationLevels) {
    if (elevation <= targetElevation) lowerElevation = elevation;
    if (elevation >= targetElevation) {
      upperElevation = elevation;
      break;
    }
  }

  // Find lower and upper bounds for OAT
  let lowerOAT, upperOAT;
  for (const oat of oatLevels) {
    if (oat <= targetOAT) lowerOAT = oat;
    if (oat >= targetOAT) {
      upperOAT = oat;
      break;
    }
  }

  // Find the data points for interpolation
  const lowerData = data.filter(item => item.Elevation === lowerElevation && item.OAT === lowerOAT);
  const upperData = data.filter(item => item.Elevation === upperElevation && item.OAT === upperOAT);

  const lowerValue = lowerData[0] ? lowerData[0].N1 : null;
  const upperValue = upperData[0] ? upperData[0].N1 : null;

  // Perform the interpolation
  const interpolatedValue = lowerValue + ((targetOAT - lowerOAT) / (upperOAT - lowerOAT)) * (upperValue - lowerValue);
  
  console.log(`Interpolated N1: ${interpolatedValue}`);
  return interpolatedValue;
}

// Revert V2 Calculation to Bilinear Interpolation
function bilinearInterpolationV2(data, targetGW) {
  console.log(`Starting Bilinear Interpolation for V2 with GW: ${targetGW}`);
  
  // Sort the data by Gross Weight (GW)
  const gwLevels = [...new Set(data.map(item => item.GW))].sort((a, b) => a - b);

  // Find lower and upper bounds for GW
  let lowerGW, upperGW;
  for (const gw of gwLevels) {
    if (gw <= targetGW) lowerGW = gw;
    if (gw >= targetGW) {
      upperGW = gw;
      break;
    }
  }

  // Find the data points for interpolation
  const lowerData = data.filter(item => item.GW === lowerGW);
  const upperData = data.filter(item => item.GW === upperGW);

  const lowerValue = lowerData[0] ? lowerData[0].V2 : null;
  const upperValue = upperData[0] ? upperData[0].V2 : null;

  // Perform the interpolation
  const interpolatedValue = lowerValue + ((targetGW - lowerGW) / (upperGW - lowerGW)) * (upperValue - lowerValue);

  console.log(`Interpolated V2: ${interpolatedValue}`);
  return interpolatedValue;
}

// Revert VR Calculation to Bilinear Interpolation
function bilinearInterpolationVR(data, targetGW) {
  console.log(`Starting Bilinear Interpolation for VR with GW: ${targetGW}`);
  
  // Sort the data by Gross Weight (GW)
  const gwLevels = [...new Set(data.map(item => item.GW))].sort((a, b) => a - b);

  // Find lower and upper bounds for GW
  let lowerGW, upperGW;
  for (const gw of gwLevels) {
    if (gw <= targetGW) lowerGW = gw;
    if (gw >= targetGW) {
      upperGW = gw;
      break;
    }
  }

  // Find the data points for interpolation
  const lowerData = data.filter(item => item.GW === lowerGW);
  const upperData = data.filter(item => item.GW === upperGW);

  const lowerValue = lowerData[0] ? lowerData[0].VR : null;
  const upperValue = upperData[0] ? upperData[0].VR : null;

  // Perform the interpolation
  const interpolatedValue = lowerValue + ((targetGW - lowerGW) / (upperGW - lowerGW)) * (upperValue - lowerValue);

  console.log(`Interpolated VR: ${interpolatedValue}`);
  return interpolatedValue;
}

// Modify the calculations in your main calculation function
const calculateButton = document.querySelector("button[type='submit']");

calculateButton.addEventListener("click", (event) => {
  event.preventDefault();

  const elevation = parseInt(document.getElementById("elevation").value, 10);
  const oat = parseInt(document.getElementById("oat").value, 10);
  const gw = parseInt(document.getElementById("gw").value, 10);

  // N1
  const n1 = bilinearInterpolationN1(n1Data, oat, elevation);

  // V1
  const v1 = bilinearInterpolationV2(f8ToData, gw);

  // Takeoff Distance
  const distance = bilinearInterpolationV2(f8DisData, gw);

  // VR
  const vr = bilinearInterpolationVR(vrData, gw);

  // V2
  const v2 = bilinearInterpolationV2(v2Data, gw);

  console.log("Calculated N1:", n1);
  console.log("Calculated V1:", v1);
  console.log("Calculated Distance:", distance);
  console.log("Calculated VR:", vr);
  console.log("Calculated V2:", v2);

  // Update the results in the form
  document.getElementById("n1-output").innerText = n1 ? n1.toFixed(2) : "N/A";
  document.getElementById("distance-output").innerText = distance !== "N/A" ? `${Math.round(distance)} ft` : "N/A";
  document.getElementById("vr-output").innerText = vr !== undefined && vr !== null ? `${Math.round(vr)} knots` : "N/A";
  document.getElementById("v2-output").innerText = v2 !== undefined && v2 !== null ? `${Math.round(v2)} knots` : "N/A";
});
