document.addEventListener("DOMContentLoaded", () => {
  let airportsData = []; // Store airport data
  const airportInput = document.getElementById("departure-airport");
  const airportSuggestions = document.getElementById("airport-suggestions");
  const elevationInput = document.getElementById("elevation");
  const oatInput = document.getElementById("oat"); // OAT (temperature) input field
  const depName = document.getElementById("depName"); // Airport name field
  const syncOATButton = document.getElementById("sync-oat");
  const syncElevationButton = document.getElementById("sync-elevation");

  let selICAO;
  let cleanedICAO;

  // Load airport data from the airports.json file
  async function loadAirportData() {
    const response = await fetch("airports.json");
    airportsData = await response.json();
  }

  // Function to fetch the latest METAR data for a given IATA code
  async function fetchMETAR(iata) {
    const apiUrl = `https://api.weather.gov/stations/${iata}/observations/latest`;

    try {
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error("Failed to fetch data from NOAA API");
      }

      const data = await response.json(); // Parse the JSON response

      if (data && data.properties) {
        const { temperature, rawMessage } = data.properties;

        // Extract temperature in Celsius
        const temperatureCelsius = temperature ? temperature.value : null;

        // Update OAT field when SYNC is clicked
        syncOATButton.addEventListener("click", () => {
          oatInput.value = temperatureCelsius !== null ? `${temperatureCelsius.toFixed(1)}` : "N/A";
          console.log("OAT synced:", oatInput.value);
        });

        // Update METAR field
        const metarSPAN = document.getElementById("rawMETAR");
        metarSPAN.textContent = rawMessage || "N/A";
      } else {
        console.log("Weather data not available");
      }
    } catch (error) {
      console.error("Failed to fetch METAR data:", error);
      document.getElementById("rawMETAR").innerText = "Unable to fetch METAR data";
      oatInput.value = "N/A";
    }
  }

  // Filter airports based on IATA code and show suggestions
  function filterAirports(query) {
    const filteredAirports = airportsData.filter((airport) =>
      airport.IATA.replace(/^"|"$/g, '').toUpperCase().includes(query.toUpperCase())
    );
    return filteredAirports;
  }

  // Handle the input event to filter airports as user types
  airportInput.addEventListener("input", (event) => {
    const query = event.target.value;
    if (query.length > 0) {
      const matchingAirports = filterAirports(query);
      airportSuggestions.innerHTML = "";
      matchingAirports.forEach((airport) => {
        const option = document.createElement("option");
        const cleanedIATA = airport.IATA.replace(/^"|"$/g, '');
        option.value = cleanedIATA;
        option.textContent = `${cleanedIATA} - ${airport.Name} (${airport.City}, ${airport.Country})`;
        selICAO = airport.ICAO.replace(/^"|"$/g, '').trim();
        airportSuggestions.appendChild(option);
      });
      airportSuggestions.style.display = matchingAirports.length > 0 ? "block" : "none";
    } else {
      airportSuggestions.style.display = "none";
    }
  });

  // Set the IATA code when the user selects an option from the dropdown
  airportSuggestions.addEventListener("change", (event) => {
    const selectedIATA = event.target.value.trim();
    const selectedAirport = airportsData.find(
      (airport) => airport.IATA.replace(/^"|"$/g, '') === selectedIATA
    );

    if (selectedAirport) {
      airportInput.value = selectedIATA;

      // Add event listener to sync Elevation
      syncElevationButton.addEventListener("click", () => {
        elevationInput.value = selectedAirport.Altitude || "N/A";
        console.log("Elevation synced:", elevationInput.value);
      });

      const cleanedAirportName = selectedAirport.Name.replace(/"/g, '').trim();
      depName.textContent = cleanedAirportName || "N/A";

      // Fetch the METAR data for the selected airport
      fetchMETAR(selectedIATA);
    } else {
      elevationInput.value = "Airport not found";
    }

    airportSuggestions.style.display = "none";
  });

  loadAirportData(); // Load airport data on page load
});
