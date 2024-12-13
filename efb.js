document.addEventListener("DOMContentLoaded", () => {
  let n1Data, f8ToData, f8DisData, vrData, v2Data, vrefData, ldaData, factData, trimData;

  const zfwSlider = document.getElementById("zfw-slider");
  const zfwInput = document.getElementById("zfw");
  const fobSlider = document.getElementById("fob-slider");
  const fobInput = document.getElementById("fob");
  const gwInput = document.getElementById("gw");
  const calculateButton = document.querySelector("button[type='submit']");
  const gwWarning = document.getElementById("gw-warning");
  const mlwFlag = document.getElementById("mlw-flag");

  const minZFW = 10360, maxZFW = 13500, minFOB = 600, maxFOB = 6240, maxGW = 18300, minGW = 0;

  // Load all JSON data concurrently
  async function loadData() {
    const dataFiles = [
      "N1_flat.json", "F8-TO_flat.json", "F8-DIS_flat.json", "VR_flat.json", "V2_flat.json",
      "vref.json", "LDAA_flat.json", "fact.json", "trim.json"
    ];
    const dataPromises = dataFiles.map(file => fetch(file).then(res => res.json()));
    [n1Data, f8ToData, f8DisData, vrData, v2Data, vrefData, ldaData, factData, trimData] = await Promise.all(dataPromises);
  }

  // Update GW and validate
  const updateGW = () => {
    const zfw = parseFloat(zfwInput.value) || 0;
    const fob = parseFloat(fobInput.value) || 0;
    const gw = zfw + fob;

    if (gw > maxGW || gw < minGW) {
      gwInput.value = gw > maxGW ? `MTOW EXCEEDED` : `Below min (${minGW})!`;
      calculateButton.disabled = true;
      gwWarning.style.display = "block";
      gwWarning.textContent = gw > maxGW ? `Gross Weight exceeds MTOW of ${maxGW} lbs!` : `Gross Weight is below the minimum limit of ${minGW} lbs!`;
    } else {
      gwInput.value = gw.toFixed(1);
      calculateButton.disabled = false;
      gwWarning.style.display = "none";
    }
  };

  const setInitialValues = () => {
    zfwSlider.value = minZFW;
    zfwInput.value = minZFW;
    fobSlider.value = minFOB;
    fobInput.value = minFOB;
    updateGW();
  };

  // Sync slider and input
  const syncSliderInput = (slider, input) => {
    slider.addEventListener("input", () => {
      input.value = slider.value;
      updateGW();
    });
    input.addEventListener("input", () => {
      const value = parseFloat(input.value);
      if (value >= minZFW && value <= maxZFW) {
        slider.value = input.value;
        updateGW();
      } else {
        input.value = slider.value;
      }
    });
  };

  syncSliderInput(zfwSlider, zfwInput);
  syncSliderInput(fobSlider, fobInput);

  setInitialValues();

  // Optimized bilinear interpolation with caching
  const bilinearInterpolation = (data, targetOAT, targetElevation) => {
    const cacheKey = `${targetOAT}_${targetElevation}`;
    if (bilinearCache[cacheKey]) return bilinearCache[cacheKey];

    const elevationLevels = [...new Set(data.map(item => item.Elevation))].sort((a, b) => a - b);
    let lowerElevation, upperElevation;

    for (let i = 0; i < elevationLevels.length; i++) {
      if (elevationLevels[i] <= targetElevation) lowerElevation = elevationLevels[i];
      if (elevationLevels[i] >= targetElevation) {
        upperElevation = elevationLevels[i];
        break;
      }
    }

    if (!lowerElevation) lowerElevation = elevationLevels[0];
    if (!upperElevation) upperElevation = elevationLevels[elevationLevels.length - 1];

    const lowerData = data.filter(item => item.Elevation === lowerElevation);
    const upperData = data.filter(item => item.Elevation === upperElevation);

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

      if (!lower || !upper || lower.OAT === upper.OAT) return lower ? lower.N1 || lower.V1 || lower.Distance : upper ? upper.N1 || upper.V1 || upper.Distance : null;
      const x1 = lower.OAT, y1 = lower.N1 || lower.V1 || lower.Distance;
      const x2 = upper.OAT, y2 = upper.N1 || upper.V1 || upper.Distance;
      return y1 + ((oat - x1) * (y2 - y1)) / (x2 - x1);
    }

    const valueAtLowerElevation = interpolateOAT(lowerData, targetOAT);
    const valueAtUpperElevation = interpolateOAT(upperData, targetOAT);

    if (valueAtLowerElevation === null || valueAtUpperElevation === null) return null;

    const x1 = lowerElevation, y1 = valueAtLowerElevation;
    const x2 = upperElevation, y2 = valueAtUpperElevation;

    const result = y1 + ((targetElevation - x1) * (y2 - y1)) / (x2 - x1);
    bilinearCache[cacheKey] = result;
    return result;
  };

  const bilinearCache = {};

  // Trilinear and other interpolation functions can also be optimized similarly.

  calculateButton.addEventListener("click", (event) => {
    event.preventDefault();
    const oat = parseInt(document.getElementById("oat").textContent, 10);
    const gw = parseInt(gwInput.value, 10);
    const elevation = parseInt(document.getElementById("elevation").textContent, 10);

    if (isNaN(elevation)) return;

    // Perform calculations here...
    const v1 = trilinearInterpolationV1(f8ToData, oat, elevation, gw);
    const distance = trilinearInterpolationDistance(f8DisData, oat, elevation, gw);
    const n1 = bilinearInterpolation(n1Data, oat, elevation);
    const vr = interpolateByGW(vrData, gw, "VR");
    const v2 = interpolateByGW(v2Data, gw, "V2");
    const vref = interpolateByGW(vrefData, gw, "VREF");
    const ldaa = trilinearInterpolationDistance(ldaData, oat, elevation, gw);
    const fact = trilinearInterpolationDistance(factData, oat, elevation, gw);
    const trim = interpolateByGW(trimData, parseInt(document.getElementById("mac-input").value, 10), "TRIM");

    if (gw > 15300) mlwFlag.innerText = "MLW EXCEEDED";

    // Update the outputs...
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

  loadData();
});
