document.addEventListener("DOMContentLoaded", () => {

const data = {};
(async function loadData() {
  const filePaths = {
    n1Data: "../lj35a/assets/data/N1_flat.json",
    f8ToData: "../lj35a/assets/data/F8-TO_flat.json",
    f8DisData: "../lj35a/assets/data/F8-DIS_flat.json",
    vrData: "../data/VR_flat.json",
    v2Data: "../data/V2_flat.json",
    vrefData: "../data/vref.json",
    ldaData: "../data/LDAA_flat.json",
    factData: "../data/fact.json",
    trimData: "../data/trim.json",
    f20ToData: "../data/F20-TO.json",
    f20DisData: "../data/F20-DIS.json",
    f20vrData: "../data/VR-20.json",
    f20v2Data: "../data/V2-20.json",
    f8MTOWdata: "../data/f8MTOW.json",
    f20MTOWdata: "../data/f20MTOW.json",
};
    try {
        await Promise.all(
            Object.entries(filePaths).map(async ([key, path]) => {
                const response = await fetch(path);
                if (!response.ok) throw new Error(`Failed to fetch ${path}`);
                data[key] = await response.json();
            })
        );
        console.log("All data successfully loaded:", data);
    } catch (error) {
        console.error("Error loading data:", error);
    }
})();


// Interpolation Functions and Other Calculations
  function interpolateMultiDimensional(data, inputs, targetValues, outputField) {
  // Helper function for linear interpolation
  function interpolate(x1, x2, f1, f2, x) {
      if (x1 === x2) return f1; // Avoid division by zero
      return f1 + ((f2 - f1) / (x2 - x1)) * (x - x1);
  }

  // Recursive function for multidimensional interpolation
  function recursiveInterpolate(data, dims, targets) {
      // Base case: Single dimension interpolation
      if (dims.length === 1) {
          const [dim] = dims;
          const target = targets[0];
          
          // Check for exact match
          const exactMatch = data.find(d => d[dim] === target);
          if (exactMatch) {
              return exactMatch[outputField];
          }

          // Otherwise, perform linear interpolation
          const points = data
              .filter(d => d[dim] !== undefined)
              .map(d => ({ key: d[dim], value: d[outputField] }))
              .sort((a, b) => a.key - b.key);

          const lower = Math.max(...points.filter(p => p.key <= target).map(p => p.key));
          const upper = Math.min(...points.filter(p => p.key >= target).map(p => p.key));

          const lowerValue = points.find(p => p.key === lower)?.value;
          const upperValue = points.find(p => p.key === upper)?.value;

          return interpolate(lower, upper, lowerValue, upperValue, target);
      } 
      
      // Recursive case: Reduce dimensions
      const [dim, ...remainingDims] = dims;
      const target = targets[0];

      // Check for exact match in current dimension
      const exactMatches = data.filter(d => d[dim] === target);
      if (exactMatches.length > 0) {
          return recursiveInterpolate(exactMatches, remainingDims, targets.slice(1));
      }

      // Otherwise, group data and interpolate
      const groups = [...new Set(data.map(d => d[dim]))]
          .filter(key => key !== undefined)
          .sort((a, b) => a - b);

      const lower = Math.max(...groups.filter(g => g <= target));
      const upper = Math.min(...groups.filter(g => g >= target));

      const lowerGroup = data.filter(d => d[dim] === lower);
      const upperGroup = data.filter(d => d[dim] === upper);

      const lowerResult = recursiveInterpolate(lowerGroup, remainingDims, targets.slice(1));
      const upperResult = recursiveInterpolate(upperGroup, remainingDims, targets.slice(1));

      return interpolate(lower, upper, lowerResult, upperResult, target);
  }

  // Validate input
  if (!Array.isArray(data) || !inputs.every(input => input in data[0])) {
      throw new Error("Invalid data or inputs");
  }

  return recursiveInterpolate(data, inputs, targetValues);
  }




});


