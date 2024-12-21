document.addEventListener("DOMContentLoaded", () => {
    let n1Data, f8ToData, f8DisData, vrData, v2Data, vrefData, ldaData, factData, trimData, f20ToData, f20DisData, f20vrData, f20v2Data, f8MTOWdata, f20MTOWdata;
    const calculateButton = document.querySelector("button[type='submit']");
    const gwInput = document.getElementById("gw");

// Load JSONS
    async function loadData() {
        //Takeoff Data
        n1Data = await fetch("/assets/data/takeoff_perf/TO_N1.json").then((res) => res.json());
        f8ToData = await fetch("/assets/data/takeoff_perf/TO_F8-V1.json").then((res) => res.json());
        f8DisData = await fetch("/assets/data/takeoff_perf/TO_F8-DIS.json").then((res) => res.json());
        vrData = await fetch("/assets/data/takeoff_perf/TO_F8-VR.json").then((res) => res.json());
        v2Data = await fetch("/assets/data/takeoff_perf/TO_F8-V2.json").then((res) => res.json());
        trimData = await fetch("/assets/data/takeoff_perf/TO_TRIM.json").then((res) => res.json());
        f20ToData = await fetch("/assets/data/takeoff_perf/TO_F20-V1.json").then((res) => res.json());
        f20DisData = await fetch("/assets/data/takeoff_perf/TO_F20-DIS.json").then((res) => res.json());
        f20vrData = await fetch("/assets/data/takeoff_perf/TO_F20-VR.json").then((res) => res.json());
        f20v2Data = await fetch("/assets/data/takeoff_perf/TO_F20-V2.json").then((res) => res.json());
        f8MTOWdata = await fetch("/assets/data/takeoff_perf/TO_F8-MTOW.json").then((res) => res.json());
        f20MTOWdata = await fetch("/assets/data/takeoff_perf/TO_F20-MTOW.json").then((res) => res.json());

        //Landing Data
        ldaData = await fetch("/assets/data/landing_perf/LDG_F40-LDR.json").then((res) => res.json());
        factData = await fetch("/assets/data/landing_perf/LDG_F40-FACT.json").then((res) => res.json());
        vrefData = await fetch("/assets/data/landing_perf/LDG_F40-VREF.json").then((res) => res.json());
        }
        loadData();
        
// Rebuilt interpolation function
function interpolateMultiDimensional(data, dimensions, targets, outputField) {
    if (!Array.isArray(data) || data.length === 0) {
        console.error("Data must be a non-empty array.", data);
        return undefined;
    }

    if (!dimensions || dimensions.length === 0) {
        console.error("No dimensions provided for interpolation.");
        return undefined;
    }

    if (!targets || dimensions.length !== targets.length) {
        console.error("Mismatch between dimensions and targets.", dimensions, targets);
        return undefined;
    }

    function linearInterpolate(x1, x2, y1, y2, x) {
        if (x1 === x2) return y1; // Avoid division by zero
        return y1 + ((y2 - y1) / (x2 - x1)) * (x - x1);
    }

    function findValidPoints(currentData, dimension, target) {
        console.log(`Filtering for dimension ${dimension}, target: ${target}`);
        console.log("Current Data:", currentData);

        const validPoints = currentData
            .filter(row => row[dimension] !== undefined && row[outputField] !== undefined)
            .map(row => ({ key: row[dimension], value: row[outputField] }))
            .sort((a, b) => a.key - b.key);

        console.log("Filtered Valid Points:", validPoints);

        if (validPoints.length === 0) {
            console.warn(`No valid points for dimension ${dimension}. Returning undefined.`);
            return { lower: undefined, upper: undefined, validPoints: [] };
        }

        const lower = validPoints.filter(point => point.key <= target).pop();
        const upper = validPoints.find(point => point.key >= target);

        console.log("Lower Point:", lower);
        console.log("Upper Point:", upper);

        return { lower, upper, validPoints };
    }

    function recursiveInterpolate(currentData, remainingDims, remainingTargets) {
        const currentDim = remainingDims[0];
        const currentTarget = remainingTargets[0];

        const { lower, upper, validPoints } = findValidPoints(currentData, currentDim, currentTarget);
        if (!validPoints || validPoints.length === 0) {
            return undefined;
        }

        if (validPoints.length === 1) {
            return validPoints[0].value;
        }

        if (!lower) {
            return validPoints[0].value;
        }
        if (!upper) {
            return validPoints[validPoints.length - 1].value;
        }

        if (remainingDims.length === 1) {
            return linearInterpolate(lower.key, upper.key, lower.value, upper.value, currentTarget);
        }

        const lowerData = currentData.filter(row => row[currentDim] === lower.key);
        const upperData = currentData.filter(row => row[currentDim] === upper.key);

        const lowerResult = recursiveInterpolate(lowerData, remainingDims.slice(1), remainingTargets.slice(1));
        const upperResult = recursiveInterpolate(upperData, remainingDims.slice(1), remainingTargets.slice(1));

        if (lowerResult === undefined || upperResult === undefined) {
            return undefined;
        }

        return linearInterpolate(lower.key, upper.key, lowerResult, upperResult, currentTarget);
    }

    console.log("Interpolating with:", { dimensions, targets, outputField });
    return recursiveInterpolate(data, dimensions, targets);
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
resetAllInfoIcons();


const zfw = parseFloat(document.getElementById("zfw").value) || 0; //Recalculate GW as a fallback
const fob = parseFloat(document.getElementById("fob").value) || 0; //Recalculate GW as a fallback
gwInput.value = (zfw + fob).toFixed(0);  //Recalculate GW as a fallback
const oat = parseInt(document.getElementById("oat").value, 10); // Set OAT
const gw = parseInt(gwInput.value, 10); // Set Gross Weight (GW)
const elevationText = document.getElementById("elevation").value; // Set Elevation
const elevation = parseInt(elevationText, 10); // Set Elevation (Int)
const flapsinput = parseInt(document.getElementById("flaps-input").value, 10); // Set Flaps (8 or 20)
const userMAC = parseInt(document.getElementById("mac-input").value, 10);
    
// Data Validation Function
function validateInput(value, min, max, fieldName, invalidMsg, outOfRangeMsg) {
    if (!isFinite(value) || value < min || value > max) {
        const errorMsg = isNaN(value) 
            ? invalidMsg 
            : outOfRangeMsg;
        console.error(`${fieldName}: ${errorMsg}`, value);
        alert(`${fieldName}: ${errorMsg}`);
        return false; // Indicates validation failed
    }
    return true; // Validation passed
}
// Validate elevation
if (!validateInput(elevation, 0, 10000, "Elevation", "Elevation is not valid.", "Elevation out of limits.")) {
    return;
}
// Validate OAT
if (!validateInput(oat, -51, 52, "OAT", "OAT is not valid!", "OAT out of limits.")) {
    return;
}
// Validate MAC
if (!validateInput(userMAC, 5, 30, "%MAC", "%MAC is not valid!", "% of MAC must be between 5.0% and 30.0%.")) {
    return;
}

// Log Calculation Inputs
console.log(`OAT: ${oat}, GW: ${gw}, Elevation ${elevation}, MAC: ${userMAC}, Flaps: ${flapsinput}`);

// Performance calcs Here
// Flaps dependent perf calcs
if (flapsinput === 8) {
    v1 = interpolateMultiDimensional(f8ToData, ["OAT", "Elevation", "GW"], [oat, elevation, gw], "V1"); // V1 for Flaps 8 
    distance = interpolateMultiDimensional(f8DisData, ["OAT", "Elevation", "GW"], [oat, elevation, gw], "Distance"); // TO Distance for Flaps 8
    vr = interpolateMultiDimensional(vrData, ["GW"], [gw], "VR"); // VR for Flaps 8 
    v2 = interpolateMultiDimensional(v2Data, ["GW"], [gw], "V2"); // V2 for Flaps 8
    rtow = interpolateMultiDimensional(f8MTOWdata, ["OAT", "elevation"], [oat, elevation], "MTOW"); // RTOW for Flaps 8

} else {
    v1 = interpolateMultiDimensional(f20ToData, ["OAT", "Elevation", "GW"], [oat, elevation, gw], "V1"); // V1 for Flaps 20
    distance = interpolateMultiDimensional(f20DisData, ["OAT", "Elevation", "GW"], [oat, elevation, gw], "Distance"); // TO Distance for Flaps 20
    vr = interpolateMultiDimensional(f20vrData, ["GW"], [gw], "VR"); // VR for Flaps 20
    v2 = interpolateMultiDimensional(f20v2Data, ["GW"], [gw], "V2"); // V2 for Flaps 20
    rtow = interpolateMultiDimensional(f20MTOWdata, ["OAT", "elevation"], [oat, elevation], "MTOW"); // RTOW for Flaps 20
}
// All other perf calcs
const n1 = interpolateMultiDimensional(n1Data, ["OAT", "Elevation"], [oat, elevation], "N1"); // N1 Power Setting
const trimResult = interpolateMultiDimensional(trimData, ["MAC"], [userMAC], "TRIM"); // Takeoff Trim
const vref = interpolateMultiDimensional(vrefData, ["GW"], [gw], "VREF"); // VREF
const ldaa = interpolateMultiDimensional(ldaData, ["OAT", "Elevation", "GW"], [oat, elevation, gw], "Distance"); // Landing Distance (Actual)
const fact = interpolateMultiDimensional(factData, ["OAT", "Elevation", "GW"], [oat, elevation, gw], "Distance"); // Landing Distance (Factored)

//Update HTML forms Below

// Set Warning Flags
// Function to insert an info icon
function insertInfoIcon(elementId, tooltip, iconClass, iconColor) {
    // Select the parent element by its ID
    const parentElement = document.getElementById(elementId);
    if (parentElement) {
        // Create a new <i> element
        const iconElement = document.createElement('i');
        iconElement.className = iconClass;       // Set the class
        iconElement.style.color = iconColor;    // Set the color
        iconElement.setAttribute('data-tooltip', tooltip); // Set the tooltip

        // Append the new icon to the parent element
        parentElement.appendChild(iconElement);
    }
}

// Function to insert multiple warning icons
function setWarningIcons(iconIds, message, iconClass, color) {
    iconIds.forEach(iconId => {
        insertInfoIcon(iconId, message, iconClass, color);
    });
}
// Compare GW to MLW
if (gw > 15300) {
    setWarningIcons(
        ['mlw-icon', 'ldgperf-icon'], 
        'Warning: GW exceeds the current MLW limit.', 
        'fa-solid fa-triangle-exclamation', 
        'orange'
    );
}
// Compare GW to Calculated RTOW
if (gw > rtow) {
    setWarningIcons(
        ['rtow-icon', 'toperf-icon'], 
        'Warning: GW exceeds RTOW.', 
        'fa-solid fa-triangle-exclamation', 
        'orange'
    );
}

//Takeoff Data
    document.getElementById("n1-output").innerText = n1 ? n1.toFixed(1) : "N/A";                                // N1
    document.getElementById("distance-output").innerText = distance ? `${Math.round(distance)} ft` : "N/A";     // TO Distance
    document.getElementById("v1-output").innerText = v1 ? `${Math.round(v1)} knots` : "N/A";                    // V1
    document.getElementById("vr-output").innerText = vr ? `${Math.round(vr)} knots` : "N/A";                    // VR
    document.getElementById("v2-output").innerText = v2 ? `${Math.round(v2)} knots` : "N/A";                    // V2
    document.getElementById("trim-output").innerText = trimResult ? trimResult.toFixed(1) : "N/A";              // TRIM
    document.getElementById("rtow-input").innerText = rtow ? `${Math.round(rtow)} lbs` : "N/A";                 // RTOW
    
//Landing Data
if(gw > 15300){
    document.getElementById("ldaa-output").innerText = "N/A";                
    document.getElementById("fact-output").innerText = "N/A";          
    document.getElementById("vref-output").innerText = "N/A";   
    document.getElementById("vapp-output").innerText = "N/A";       

} else {
    document.getElementById("ldaa-output").innerText = ldaa ? `${Math.round(ldaa)} feet` : "N/A";               //Landing Dist Required
    document.getElementById("fact-output").innerText = fact ? `${Math.round(fact)} feet` : "N/A";               //Landing Dist Factored
    document.getElementById("vref-output").innerText = vref ? `${Math.round(vref)} knots` : "N/A";              //VREF
    // Calculate and populate Vapp (Vref + Gust Factor)
    const gustFactor = parseInt(document.getElementById("gust-factor").value);                                  //Set Gust Factor
    const vapp = gustFactor + vref                                                                              //VREF + Gust Factor
    document.getElementById("vapp-output").innerText = vapp ? `${Math.round(vapp)} knots` : "N/A";              //Vapp
}

});

});
