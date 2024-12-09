document.addEventListener("DOMContentLoaded", () => {
  let airportsData = []; // Store airport data
  const airportInput = document.getElementById("departure-airport");
  const airportSuggestions = document.getElementById("airport-suggestions");
  const elevationField = document.getElementById("elevation");
  const metarReport = document.getElementById("metar-report"); // New METAR report div
  const oatInput = document.getElementById("oat"); // OAT (temperature) input field
  const depName = document.getElementById("depName"); // Airport name field

  // Load airport data from the airports.json file
  async function loadAirportData() {
    const response = await fetch("airports.json");
    airportsData = await response.json();
    console.log("Loaded airports data:", airportsData); // Log loaded airport data for inspection
  }

  // Function to fetch the latest METAR data for a given IATA code
  async function fetchMETAR(iata) {
    const apiUrl = `https://api.weather.gov/stations/${iata}/observations/latest`;

    try {
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error("Failed to fetch data from NOAA API");
      }

      const data = await response.json();  // Parse the JSON response
    
      // Check if we received valid data
    if (data && data.properties) {
      const { rawMessage, temperature, windSpeed, windDirection, pressure, humidity } = data.properties;

       // Log rawMessage to inspect its structure
  console.log('Raw Message:', typeof rawMessage); // Log rawMessage to check if it's an object or string

        // Extract temperature in Celsius
        const temperatureCelsius = temperature ? temperature.value : 'N/A';

        // Extract wind data (Speed and Direction)
        const windSpeedKph = windSpeed ? windSpeed.value : 'N/A'; // Speed in meters per second
        const windDirectionDegrees = windDirection ? windDirection.value : 'N/A';

        // Extract atmospheric pressure
        const pressureMb = pressure ? pressure.value : 'N/A'; // Pressure in millibars

        // Extract humidity
        const humidityPercentage = humidity ? humidity.value : 'N/A'; // Humidity as percentage


        // Optionally, update the OAT field or any other fields you want in the UI
        const oatSpan = document.getElementById("oat");
        oatSpan.textContent = temperatureCelsius;  // Populate the OAT span with the temperature
        const metarSPAN = document.getElementById("rawMETAR")
        metarSPAN.textContent = rawMessage // Populate with RAW Metar Data
      } else {
        console.log("Weather data not available");
      }
    } catch (error) {
      console.error("Failed to fetch METAR data:", error);
      metarReport.textContent = "Unable to fetch METAR data.";
    }
  }

  // Filter airports based on IATA code and show suggestions
  function filterAirports(query) {
    console.log("Filtering airports for query:", query); // Log the query
    const filteredAirports = airportsData.filter(airport =>
      airport.IATA.replace(/^"|"$/g, '').toUpperCase().includes(query.toUpperCase()) // Remove quotes before matching
    );
    console.log("Filtered airports:", filteredAirports); // Log the filtered airports
    return filteredAirports;
  }

  // Handle the input event to filter airports as user types
  airportInput.addEventListener("input", (event) => {
    const query = event.target.value;
    if (query.length > 0) {
      const matchingAirports = filterAirports(query);
      airportSuggestions.innerHTML = "";
      matchingAirports.forEach(airport => {
        const option = document.createElement("option");
        const cleanedIATA = airport.IATA.replace(/^"|"$/g, '');  // Clean IATA code before setting value
        option.value = cleanedIATA;  // Set IATA code as value
        option.textContent = `${cleanedIATA} - ${airport.Name} (${airport.City}, ${airport.Country})`; 
        airportSuggestions.appendChild(option);
      });

      airportSuggestions.style.display = matchingAirports.length > 0 ? "block" : "none";
    } else {
      airportSuggestions.style.display = "none";
    }
  });

  // Set the IATA code when the user selects an option from the dropdown
  airportSuggestions.addEventListener("change", (event) => {
    let selectedIATA = event.target.value;  // Get the IATA code from selected option

    // Log the selected IATA code before the search
    console.log("Selected IATA Code:", selectedIATA);

    // Clean up the IATA code for the search
    const cleanedIATA = selectedIATA.replace(/^"|"$/g, '').trim();

    // Look for the IATA code without quotes in the data (search without quotes)
    const selectedAirport = airportsData.find(airport => airport.IATA.replace(/^"|"$/g, '') === cleanedIATA);
    
    // Log the airport found
    console.log("Selected Airport:", selectedAirport);

    if (selectedAirport) {
        airportInput.value = cleanedIATA;
        
        // Populate the elevation field with the airport's elevation
        elevationField.textContent = selectedAirport.Altitude || "N/A"; // Fallback if Altitude is undefined

   
// Remove the quotes from the airport name if present
const cleanedAirportName = selectedAirport.Name.replace(/"/g, '').trim();

// Populate the airport name without quotes
depName.textContent = cleanedAirportName || "N/A";  // Fallback if name is undefined
        
        // Fetch the METAR data for the selected airport using the cleaned IATA
        fetchMETAR(cleanedIATA);
    } else {
        console.log("Airport not found in data:", selectedIATA);  // Log if airport is not found
        elevationField.textContent = "Airport not found";
    }
    
    airportSuggestions.style.display = "none";
  });

  loadAirportData(); // Load airport data on page load
});
