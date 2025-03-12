// Add all scripts to the JS folder
var map;
//Create the map
function createMap() {
    map = L.map('map').setView([46.00318583226062, -94.60267026275974], 7);

    var OpenStreetMap_Mapnik = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	    maxZoom: 19,
	    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    //Get data for the map
    getData(map)
}

//Calculate minimum values for proportional circles
function calculatedMinValue(data) {
    //Create an empty array to store all data values
   var allValues = [];

   //Loop through each city
   for(var i=0; i < data.features.length; i++) {
    var properties = data.features[i].properties;
    //Loop through each year
    for(var year = 2010; year <= 2019; year ++) {
        //Get population for current year
        var value = properties[String(year) + " Pop" ]; 
        //Add values to array
        allValues.push(value);
    }
   }
   //Get minimum value in array
   var minValue = Math.min(...allValues);

   return minValue;
}

//Calculate radius of each proportional symbol
function calcPropRadius(attValue) {
    //Constant factor adjusts symbol sizes evenly
    var minRadius = 3;

    //Flannery Appearance Compensation formula
    var radius = 1.0083 * Math.pow(attValue/minValue,0.5715) * minRadius;

    return radius;
}

function pointToLayer(feature, latlng, attributes){

    //Attribute to symbolize
    var attribute = attributes[0];

    // Create marker options
    var geojsonMarkerOptions = {
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    // Set the marker radius based on longitude
    geojsonMarkerOptions.radius = calcPropRadius(attValue);

    // Create circle marker layer
    var layer = L.circleMarker(latlng, geojsonMarkerOptions);

    // Popup content
    var popupContent = `
        <p><b>County: </b>${feature.properties.CTY_NAME}<br>
        <b>2010 Population: </b>${feature.properties[attribute]}<br>
        </p>
    `;

    // Bind popup to circle marker
    layer.bindPopup(popupContent);

    return layer; // 
}

// Function to create symbols
function createPropSymbols(data, map, attributes){
    
    // Add the GeoJSON layer
    L.geoJson(data, {
        pointToLayer: function(feature, latlng) {
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
}

//Create new sequence controls
function createSequenceControls(attributes) {
    var slider = "<input class='range-slider' type='range'></input>";
    document.querySelector("#panel").insertAdjacentHTML('beforeend',slider);

    //set slider attributes
    document.querySelector(".range-slider").max = 9;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;

    //Step buttons
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="reverse"></button>');
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="forward"></button>');

    //Make the buttons images now
    document.querySelector('#reverse').insertAdjacentHTML('beforeend',"<img src='img/backward.png'>")
    document.querySelector('#forward').insertAdjacentHTML('beforeend',"<img src='img/forward.png'>")

    //Create click listeners for buttons
    document.querySelectorAll('.step').forEach(function(step){
        step.addEventListener("click", function(){
            var index = document.querySelector('.range-slider').value;

            //Step 6: increment or decrement depending on button clicked
            if (step.id == 'forward'){
                index++;
                //Step 7: if past the last attribute, wrap around to first attribute
                index = index > 9 ? 0 : index;
            } else if (step.id == 'reverse'){
                index--;
                //Step 7: if past the first attribute, wrap around to last attribute
                index = index < 0 ? 9 : index;
            };

            //Step 8: update slider
            document.querySelector('.range-slider').value = index;

            console.log(attributes[index])

            //Step 9: pass new attribute to update symbols
            updatePropSymbols(attributes[index]);
        })

        
    })

    //Step 5: input listener for slider
    document.querySelector('.range-slider').addEventListener('input', function(){            
        var index = this.value;
        
        //Step 9: pass new attribute to update symbols
        updatePropSymbols(attributes[index]);
    });
}

//Step 10: Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);
            
            //add city to popup content string
            var popupContent = "<p><b>County:</b> " + props.CTY_NAME + "</p>";
            
            //add formatted attribute to panel content string
            var year = attribute.split(" ")[0];
            popupContent += "<p><b>Population in " + year + ":</b> " + props[attribute]+ "</p>";
            
            //update popup content            
            popup = layer.getPopup();            
            popup.setContent(popupContent).update();
        };
    });
};

//Build array of attributes from the GeoJson
function processData(data) {
    var attributes = [];

    //Properties of first feature in dataset
    var properties = data.features[0].properties;

    //Push each attribute name into attributes array
    for(var attribute in properties) {
        //Only take attributes with population values
        if(attribute.indexOf("Pop") > -1) {
            attributes.push(attribute);
        }
    }

    return attributes;
}

//Step 2: Import GeoJSON data
function getData(map){
    //load the data
    fetch('data/MN_County_Pop.geojson')
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            //Create an attributes array
            var attributes = processData(json);
            //Calculate minimum data value
            minValue = calculatedMinValue(json);
            //call function to create proportional symbols
            createPropSymbols(json, map, attributes);
            //Function for sequence control
            createSequenceControls(attributes);
        })
};

document.addEventListener('DOMContentLoaded',createMap);

