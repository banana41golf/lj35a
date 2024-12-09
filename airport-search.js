document.addEventListener("DOMContentLoaded", () => {
  let airportsData = []; // Store airport data
  const airportInput = document.getElementById("departure-airport");
  const airportSuggestions = document.getElementById("airport-suggestions");
  const elevationField = document.getElementById("elevation");
  const metarReport = document.getElementById("metar-report"); // New METAR report div
  const oatInput = document.getElementById("oat"); // OAT (temperature) input field

  // Load airport data from the airports.json file
  async function loadAirportData() {
    const response = await fetch("airports.json");
    airportsData = await response.json();
    console.log("Loaded airports data:", airportsData); // Log loaded airport data for inspection
  }

  // Function to fetch METAR data from AviationWeather Center's HTML API for a given IATA code
  async function fetchMETAR(iata) {
    const apiUrl = `https://cors-anywhere.herokuapp.com/https://aviationweather.gov/cgi-bin/data/metar.php?ids=${iata}&hours=0&order=id%2C-obs&sep=true&format=html`;
    try {
      const response = await fetch(apiUrl);
      const data = await response.text();

      // Parse the HTML response to extract the temperature and METAR report
      const tempMatch = data.match(/Temperature: (\d+)&deg;C/); // Extract temperature in Celsius
      if (tempMatch) {
        const temperatureCelsius = parseInt(tempMatch[1], 10);
        oatInput.value = temperatureCelsius; // Populate the OAT field with temperature
      }

      // Display the full METAR report
      metarReport.textContent = data;
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
        option.value = airport.IATA.replace(/^"|"$/g, '');  // Remove quotes when setting value
        option.textContent = `${airport.IATA.replace(/^"|"$/g, '')} - ${airport.Name} (${airport.City}, ${airport.Country})`; 
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

    // Remove quotes from the selected IATA code for the search
    const cleanedIATA = selectedIATA.replace(/^"|"$/g, '').trim();

    // Look for the IATA code without quotes in the data (search without quotes)
    const selectedAirport = airportsData.find(airport => airport.IATA.replace(/^"|"$/g, '') === cleanedIATA);
    
    // Log the airport found
    console.log("Selected Airport:", selectedAirport);

    if (selectedAirport) {
        airportInput.value = cleanedIATA;
        
        // Populate the elevation field with the airport's elevation
        elevationField.textContent = selectedAirport.Altitude || "N/A"; // Fallback if Altitude is undefined
        
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
