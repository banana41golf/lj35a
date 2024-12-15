document.addEventListener("DOMContentLoaded", () => {
  let airportsData = []; // Store airport data
  const airportInput = document.getElementById("departure-airport");
  const airportSuggestions = document.getElementById("airport-suggestions");
  const elevationField = document.getElementById("elevation");
  const metarReport = document.getElementById("metar-report"); // New METAR report div
  const oatInput = document.getElementById("oat"); // OAT (temperature) input field
  const depName = document.getElementById("depName"); // Airport name field
  let selICAO; 
  let cleanedICAO;
  let matchingRunways = [];
  let runwayIds = [];

  // Load airport data from the airports.json file
  async function loadAirportData() {
    const response = await fetch("airports.json");
    airportsData = await response.json();
    //console.log("Loaded airports data:", airportsData); // Log loaded airport data for inspection
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



        // Extract temperature in Celsius
        const temperatureCelsius = temperature ? temperature.value : 'N/A';

        // Extract wind data (Speed and Direction)
        const windSpeedKph = windSpeed ? windSpeed.value : 'N/A'; // Speed in meters per second
        const windDirectionDegrees = windDirection ? windDirection.value : 'N/A';

        // Extract atmospheric pressure
        const pressureMb = pressure ? pressure.value : 'N/A'; // Pressure in millibars

        // Extract humidity
        const humidityPercentage = humidity ? humidity.value : 'N/A'; // Humidity as percentage


        // Update OAT and METAR fields
        const oatInput = document.getElementById("oat");
oatInput.value = temperatureCelsius !== null ? `${temperatureCelsius.toFixed(1)}`: "N/A";
  // Populate the OAT span with the temperature
        const metarSPAN = document.getElementById("rawMETAR")
        metarSPAN.textContent = rawMessage // Populate with RAW Metar Data
        document.getElementById("sync-oat").disabled = false;
        document.getElementById("sync-oat").style.cursor = "pointer";
        document.getElementById("sync-oat").style.backgroundColor = "#00bcd4";
      } else {
        console.log("Weather data not available");
      }
    } catch (error) {
      console.error("Failed to fetch METAR data:", error);
      document.getElementById("rawMETAR").innerText = "Unable to fetch METAR data";
      document.getElementById("sync-oat").disabled = true; // Disable the SYNC OAT button
      document.getElementById("sync-oat").style.cursor = "not-allowed";
      document.getElementById("sync-oat").style.backgroundColor = "gray";
      document.getElementById("oat").innerText = "N/A";
    }
  }

  // Filter airports based on IATA code and show suggestions
  function filterAirports(query) {
    // console.log("Filtering airports for query:", query); // DBUG: Log the query // Reenable for trouble shooting
    const filteredAirports = airportsData.filter(airport =>
      airport.IATA.replace(/^"|"$/g, '').toUpperCase().includes(query.toUpperCase()) // Remove quotes before matching
    );
    // console.log("Filtered airports:", filteredAirports); // DBUG: Log the filtered airports 
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
        //console.log(airport.ICAO);
        const selICAO = airport.ICAO;
        //console.log(selICAO);
        cleanedICAO = selICAO.replace(/^"|"$/g, '').trim();
        //console.log(cleanedICAO);
        airportSuggestions.appendChild(option);
      });

      // Close the dropdown if the user clicks outside
document.addEventListener("click", (event) => {
  // Check if the click target is outside the input field and dropdown
  if (
    event.target !== airportInput &&
    event.target !== airportSuggestions &&
    !airportSuggestions.contains(event.target)
  ) {
    airportSuggestions.style.display = "none";
  }
});

// Bonus: Handle clicks on dropdown options
airportSuggestions.addEventListener("click", (event) => {
  const selectedOption = event.target;
  if (selectedOption.tagName === "OPTION") {
    airportInput.value = selectedOption.value; // Set the input value to the selected option
    airportSuggestions.style.display = "none"; // Hide the dropdown
  }
});


      // Load Runway Data
      async function loadRunwaysData(cleanedICAO) {
        const response = await fetch("runways.json");
        const runwaysData = await response.json();
    
        // Find the matching airport based on ICAO (ARPT_ID)
        runwayIDs = runwaysData.filter(runway => runway.ARPT_ID === cleanedICAO);
    
        // Debug: Log the populated runwayIDs array
        //console.log("Runway IDs array:", runwayIDs);
    
        // Call the function to populate the dropdown
        populateRunwayDropdown(runwayIDs);

        // Reset the runway dropdown to "Select Runway" if any option was pre-selected
        const runwaySelect = document.getElementById("runway-select");
        runwaySelect.value = "";  // Reset dropdown to default value ("Select Runway")
        const rwyLength = document.getElementById("runway-length");
        rwyLength.textContent = "N/A";  // Reset runway length to N/A
    }
    
    // Function to populate the runway dropdown using the correct variable (runwayIDs)
    function populateRunwayDropdown(runwayIDs) {
        const runwaySelect = document.getElementById("runway-select");
        runwaySelect.innerHTML = '';  // Clear any existing options
    
        // Debug: Log the runwayIDs array to check its structure
        // console.log("Runway IDs in populate function:", runwayIDs);
    
        // If the runwayIDs array is populated, proceed to populate the dropdown
        const rect = airportInput.getBoundingClientRect();
airportSuggestions.style.top = `${rect.bottom + window.scrollY}px`;
airportSuggestions.style.left = `${rect.left + window.scrollX}px`;
airportSuggestions.style.width = `${rect.width}px`;

        if (runwayIDs.length > 0) {
            runwayIDs.forEach(runway => {
                // Check if RWY_ID exists and is an array
                if (Array.isArray(runway.RWY_ID)) {
                    runway.RWY_ID.forEach(rwyId => {
                        const option = document.createElement("option");
                        option.value = rwyId;
                        option.textContent = `Runway ${rwyId}`;  // Customize this text if needed
                        runwaySelect.appendChild(option);
                    });
                }
            });
        } else {
            //console.log("No runways found to populate the dropdown.");
        }
    }
    
    // Example: Assuming ICAO is already set, call the function to load data
    loadRunwaysData(cleanedICAO);  // Call after ICAO is selected and set

    // Event listener to handle the selection of a runway
document.getElementById("runway-select").addEventListener("change", (event) => {
  const selectedRunwayId = event.target.value;  // Get selected runway ID

  // Find the runway data from the runwayIDs array based on the selected ID
  const selectedRunway = runwayIDs.find(runway => runway.RWY_ID.includes(selectedRunwayId));

  // Display the runway length if a matching runway is found
  const runwayLengthField = document.getElementById("runway-length");
  if (selectedRunway) {
      runwayLengthField.textContent = `${selectedRunway.RWY_LEN} feet`;  // Set the runway length
  } else {
      runwayLengthField.textContent = "Runway length not available.";  // Fallback if no match
  }
});


/// end of runway search section

      airportSuggestions.style.display = matchingAirports.length > 0 ? "block" : "none";
    } else {
      airportSuggestions.style.display = "none";
    }
  });

  // Set the IATA code when the user selects an option from the dropdown
  airportSuggestions.addEventListener("change", (event) => {
    let selectedIATA = event.target.value;  // Get the IATA code from selected option

    // Log the selected IATA code before the search
    //console.log("Selected IATA Code:", selectedIATA);

    // Clean up the IATA code for the search
    const cleanedIATA = selectedIATA.replace(/^"|"$/g, '').trim();

    // Look for the IATA code without quotes in the data (search without quotes)
    const selectedAirport = airportsData.find(airport => airport.IATA.replace(/^"|"$/g, '') === cleanedIATA);
    
    // Log the airport found
    console.log("Selected Airport:", selectedAirport);

    if (selectedAirport) {
        airportInput.value = cleanedIATA;
        
        // Populate the elevation field with the airport's elevation
        elevationField.value = selectedAirport.Altitude || "N/A"; // Fallback if Altitude is undefined

   
// Remove the quotes from the airport name if present
const cleanedAirportName = selectedAirport.Name.replace(/"/g, '').trim();

// Populate the airport name without quotes
depName.textContent = cleanedAirportName || "N/A";  // Fallback if name is undefined
        
        // Fetch the METAR data for the selected airport using the cleaned IATA
        fetchMETAR(cleanedIATA);
    } else {
        //console.log("Airport not found in data:", selectedIATA);  // Log if airport is not found
        elevationField.value = "Airport not found";
    }
    
    airportSuggestions.style.display = "none";
  });


    // Add SYNC functionality for OAT
    document.getElementById("sync-oat").addEventListener("click", () => {
      const iataCode = document.getElementById("departure-airport").value.trim();
      if (!iataCode) {
        alert("Please select an airport first.");
        return;
      }
      fetchMETAR(iataCode); // Re-fetch METAR and update OAT
    });
  
    // Add SYNC functionality for elevation
    document.getElementById("sync-elevation").addEventListener("click", () => {
      const iataCode = document.getElementById("departure-airport").value.trim();
      if (!iataCode) {
        alert("Please select an airport first.");
        return;
      }
      const selectedAirport = airportsData.find(
        airport => airport.IATA.replace(/^"|"$/g, '') === iataCode
      );
      if (selectedAirport) {
        const elevation = selectedAirport.Altitude || "N/A"; // Use stored altitude
        document.getElementById("elevation").value = elevation;
      } else {
        alert("Airport not found. Please try again.");
      }
    });

  loadAirportData(); // Load airport data on page load
});
